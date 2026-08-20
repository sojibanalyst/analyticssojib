// Relative with an explicit extension so `node --test` can resolve it: the
// runner does not know the @/ alias, and the one guard in this file that keeps
// GA4 from double-counting is not a thing to leave untested.
import { redactSecrets } from "../redact.ts";
import type {
  DestinationAdapter,
  DestinationConfig,
  ForwardEvent,
  ForwardOutcome,
} from "./types.ts";

/**
 * GA4 Measurement Protocol.
 *
 * THE TRAP THIS FILE EXISTS TO AVOID
 *
 * GA4 does not deduplicate by event_id. Meta and TikTok do — send them the
 * same event from the browser and from the server under one event id and they
 * resolve it to one conversion. GA4 has no such mechanism on the Measurement
 * Protocol: an event sent from both paths is two events, two conversions, and
 * a report that is quietly double what it should be, with nothing anywhere
 * reporting an error.
 *
 * So the rule is an allowlist, in code, checked before anything else happens:
 * exactly one event name may be forwarded, and it is the one that is NEVER
 * sent client-side. page_view is denied by name as well, because it is the
 * event most likely to be added here by someone reasoning that "more data is
 * better" — it is the highest-volume event on the site and the browser already
 * sends every one of them.
 */

/**
 * The only events that may reach GA4 through the Measurement Protocol.
 *
 * generate_lead qualifies because it is server-confirmed — it fires when the
 * database has accepted the row, not when a button was clicked — and because
 * lib/track.ts does not send it from the browser.
 *
 * Adding to this set means proving the event is not also sent client-side.
 */
const FORWARDABLE = new Set(["generate_lead"]);

/** Denied by name, with its own message, because it is the likely mistake. */
const NEVER = new Set(["page_view"]);

const ENDPOINT = "https://www.google-analytics.com/mp/collect";
const DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect";

/** GA4 rejects a hit older than 72 hours. */
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

/**
 * Three seconds. This runs after the response has been sent, so it is not the
 * visitor waiting — but it is a serverless invocation staying alive, and GA4
 * either answers immediately or is not going to.
 */
const TIMEOUT_MS = 3000;

export type Ga4Payload = {
  client_id: string;
  timestamp_micros: string;
  non_personalized_ads: boolean;
  events: {
    name: string;
    params: Record<string, string | number | boolean>;
  }[];
};

export const ga4Adapter: DestinationAdapter = {
  key: "ga4",

  canHandle(event: ForwardEvent, config: DestinationConfig) {
    if (NEVER.has(event.eventName)) {
      return {
        ok: false,
        reason:
          `${event.eventName} is never forwarded to GA4. The browser already sends it, ` +
          "and GA4 does not deduplicate by event_id — both copies would be counted.",
      };
    }

    if (!FORWARDABLE.has(event.eventName)) {
      return {
        ok: false,
        reason:
          `${event.eventName} is not on the GA4 forwarding allowlist. Only server-confirmed ` +
          "events that are not also sent from the browser may go, because GA4 counts " +
          "duplicates rather than resolving them.",
      };
    }

    if (!config.measurement_id) {
      return { ok: false, reason: "No measurement ID set on the GA4 destination." };
    }

    // No client id means GA4 invents a user. The event would arrive and be
    // attributed to a one-event phantom session, which reads as real traffic.
    if (!event.clientId) {
      return {
        ok: false,
        reason:
          "No _ga cookie on this request, so there is no client_id. Sending anyway would " +
          "create a fabricated user in GA4 rather than attach the lead to the real one.",
      };
    }

    const age = Date.now() - new Date(event.occurredAt).getTime();
    if (!Number.isFinite(age)) {
      return { ok: false, reason: `Unparseable event timestamp: ${event.occurredAt}` };
    }
    if (age > MAX_AGE_MS) {
      return {
        ok: false,
        reason: `Event is ${Math.round(age / 3600000)}h old; GA4 rejects anything past 72h.`,
      };
    }

    return { ok: true };
  },

  transform(event: ForwardEvent): Ga4Payload {
    const params: Record<string, string | number | boolean> = {
      // Required for the hit to count towards engagement. Without it the
      // session shows zero engaged time and can be classified as a bounce.
      engagement_time_msec: 1,
      // The id the browser push carries too, so the two can be reconciled by
      // hand even though GA4 will not do it automatically.
      event_id: event.eventId,
    };

    // Attaches the hit to the visitor's existing GA4 session instead of
    // opening a new one. Omitted rather than faked when the cookie is absent.
    if (event.sessionId) params.session_id = event.sessionId;
    if (event.pagePath) params.page_location = event.pagePath;

    for (const [key, value] of Object.entries(event.params)) {
      if (value === null || value === undefined) continue;
      if (key in params) continue;
      params[key] = value;
    }

    return {
      client_id: event.clientId as string,
      // Microseconds, and GA4 checks it against the 72-hour window that
      // canHandle has already enforced.
      timestamp_micros: String(new Date(event.occurredAt).getTime() * 1000),
      non_personalized_ads: true,
      events: [{ name: event.eventName, params }],
    };
  },

  async send(
    payload: unknown,
    config: DestinationConfig,
    secret: string,
  ): Promise<ForwardOutcome> {
    const query =
      `?measurement_id=${encodeURIComponent(config.measurement_id)}` +
      `&api_secret=${encodeURIComponent(secret)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(ENDPOINT + query, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });

      // The live endpoint answers 204 with an empty body whatever happens, so
      // there is nothing in the response to check. A 2xx means "accepted the
      // request", not "accepted the event" — which is why /debug exists and
      // why the Test button on /admin/destinations reports Inconclusive.
      if (res.status >= 200 && res.status < 300) {
        return {
          status: "sent",
          responseCode: res.status,
          message: `GA4 accepted the hit (HTTP ${res.status}). The Measurement Protocol returns no body, so this confirms delivery, not correctness — see the debug validation in the last test.`,
        };
      }

      const body = (await res.text()).slice(0, 400);
      return {
        status: "failed",
        responseCode: res.status,
        message: redactSecrets(`HTTP ${res.status} from GA4: ${body}`, secret),
      };
    } catch (error) {
      const reason = (error as Error).name === "AbortError"
        ? `No response from GA4 within ${TIMEOUT_MS}ms.`
        : `Could not reach GA4: ${(error as Error).message}`;
      return { status: "failed", message: redactSecrets(reason, secret) };
    } finally {
      clearTimeout(timer);
    }
  },
};

/**
 * The same payload, against the validation endpoint.
 *
 * Separate from send() on purpose: /debug/mp/collect never records anything, so
 * calling it in the forwarding path would mean nothing was ever delivered. It
 * exists so a payload can be checked by hand, and so the validationMessages can
 * be shown rather than described.
 */
export async function validateGa4Payload(
  payload: unknown,
  config: DestinationConfig,
  secret: string,
): Promise<{ status: number; body: string }> {
  const query =
    `?measurement_id=${encodeURIComponent(config.measurement_id)}` +
    `&api_secret=${encodeURIComponent(secret)}`;

  const res = await fetch(DEBUG_ENDPOINT + query, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return { status: res.status, body: await res.text() };
}
