import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Reading a Calendly webhook, safely.
 *
 * Pure functions: signature verification and payload extraction, with no
 * network and no database, so both can be tested without a booking.
 */

export type CalendlyInvitee = {
  inviteeUri: string;
  eventUri: string | null;
  name: string;
  email: string;
  /** utm_content, which is where /book puts our reference. */
  ref: string | null;
  /** The booking questions, as asked and answered. */
  answers: Record<string, string>;
  bookedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
};

/**
 * Calendly signs with `Calendly-Webhook-Signature: t=<unix>,v1=<hmac>`, where
 * the HMAC is over `<t>.<raw body>` using the signing key from the webhook
 * subscription.
 *
 * An unauthenticated endpoint that creates leads is an endpoint anyone can
 * create leads on — including someone who noticed that a lead with status
 * BOOKED is the most trusted row in this database.
 */
export function verifyCalendlySignature(
  header: string | null,
  rawBody: string,
  signingKey: string,
  now: Date = new Date(),
  toleranceSeconds = 300,
): { ok: true } | { ok: false; reason: string } {
  if (!signingKey) return { ok: false, reason: "No signing key configured." };
  if (!header) return { ok: false, reason: "No Calendly-Webhook-Signature header." };

  const parts = new Map(
    header
      .split(",")
      .map((part) => part.trim().split("="))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()]),
  );

  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return { ok: false, reason: "Malformed signature header." };

  // Replay window. Without it a captured request stays valid for ever.
  const age = Math.abs(now.getTime() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: `Signature timestamp is ${Math.round(age)}s away from now.` };
  }

  const expected = createHmac("sha256", signingKey)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the length is not the secret.
  if (a.length !== b.length) return { ok: false, reason: "Signature does not match." };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "Signature does not match." };

  return { ok: true };
}

type Payload = {
  event?: string;
  payload?: {
    uri?: string;
    email?: string;
    name?: string;
    created_at?: string;
    canceled_at?: string;
    cancellation?: { reason?: string; canceled_at?: string };
    questions_and_answers?: { question?: string; answer?: string }[];
    tracking?: Record<string, string | null>;
    scheduled_event?: { uri?: string; start_time?: string };
  };
};

/**
 * Pulls what matters out of an invitee payload.
 *
 * Defensive about every field: this is a third party's JSON, the shape has
 * changed before, and a missing question should not cost a booking.
 */
export function inviteeFromPayload(body: unknown): CalendlyInvitee | null {
  const parsed = body as Payload;
  const p = parsed?.payload;
  if (!p || typeof p !== "object") return null;

  const inviteeUri = typeof p.uri === "string" ? p.uri : "";
  const email = typeof p.email === "string" ? p.email : "";
  if (!inviteeUri || !email) return null;

  const answers: Record<string, string> = {};
  for (const qa of p.questions_and_answers ?? []) {
    const q = (qa?.question ?? "").trim().slice(0, 200);
    const a = (qa?.answer ?? "").trim().slice(0, 2000);
    if (q && a) answers[q] = a;
  }

  const tracking = p.tracking ?? {};
  const ref = typeof tracking.utm_content === "string" ? tracking.utm_content : null;

  return {
    inviteeUri,
    eventUri: typeof p.scheduled_event?.uri === "string" ? p.scheduled_event.uri : null,
    name: (typeof p.name === "string" ? p.name : "").trim(),
    email: email.trim().toLowerCase(),
    ref,
    answers,
    bookedAt:
      typeof p.scheduled_event?.start_time === "string"
        ? p.scheduled_event.start_time
        : typeof p.created_at === "string"
          ? p.created_at
          : null,
    canceledAt:
      typeof p.cancellation?.canceled_at === "string"
        ? p.cancellation.canceled_at
        : typeof p.canceled_at === "string"
          ? p.canceled_at
          : null,
    cancelReason:
      typeof p.cancellation?.reason === "string" ? p.cancellation.reason.slice(0, 500) : null,
  };
}

export function calendlyEventName(body: unknown): string | null {
  const value = (body as Payload)?.event;
  return typeof value === "string" ? value : null;
}
