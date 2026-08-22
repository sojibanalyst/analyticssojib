import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { isBookingRef } from "@/lib/booking-ref";
import {
  calendlyEventName,
  inviteeFromPayload,
  verifyCalendlySignature,
} from "@/lib/calendly-webhook";
import { forwardEvent } from "@/lib/forwarding";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * The Calendly webhook: a booking becomes a lead.
 *
 * A booked call is the most valuable thing that happens on this site, and
 * until now it existed only inside Calendly — no lead row, no generate_lead,
 * and a BOOKED status in the console that nothing could reach.
 *
 * Four things this endpoint has to get right, all of which will actually
 * happen rather than being hypothetical:
 *
 *   signature   an unauthenticated endpoint that creates leads is an endpoint
 *               anyone can create leads on.
 *   idempotency Calendly retries. record_booking is keyed on the invitee URI,
 *               so a retry returns the existing lead and writes nothing.
 *   no ref      somebody shared the Calendly link directly. Recorded as a lead
 *               with attribution "unknown" — never as direct, because nobody
 *               observed a first touch to call direct.
 *   cancelled   updates the lead instead of leaving a phantom booked call.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Always 200 to Calendly once the signature is good: a non-2xx makes it retry
 *  for hours, and our own failure to write is not something a retry fixes. */
const OK = () => new NextResponse(null, { status: 200 });

export async function POST(request: NextRequest) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? "";
  const raw = await request.text();

  const verdict = verifyCalendlySignature(
    request.headers.get("calendly-webhook-signature"),
    raw,
    signingKey,
  );
  if (!verdict.ok) {
    console.warn("calendly: rejected —", verdict.reason);
    // 401 rather than 200: this one IS worth Calendly retrying, and worth
    // being visible if the signing key is ever wrong.
    return new NextResponse(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return OK();
  }

  const event = calendlyEventName(body);
  const invitee = inviteeFromPayload(body);
  if (!invitee) {
    console.warn("calendly: payload had no invitee uri or email");
    return OK();
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("calendly: no service role key, booking discarded");
    return OK();
  }

  const supabase = getAdminClient();

  if (event === "invitee.canceled") {
    const { error } = await supabase.rpc("record_booking_cancellation", {
      p_invitee_uri: invitee.inviteeUri,
      p_reason: invitee.cancelReason ?? undefined,
      p_canceled_at: invitee.canceledAt ?? undefined,
    });
    if (error) console.error("calendly: cancellation failed", error.message);
    return OK();
  }

  if (event !== "invitee.created") return OK();

  // utm_content is a public parameter anyone can put anything in, so the shape
  // is checked before it is used as a key.
  const ref = isBookingRef(invitee.ref) ? invitee.ref : null;

  const { data, error } = await supabase.rpc("record_booking", {
    p_invitee_uri: invitee.inviteeUri,
    p_event_uri: invitee.eventUri ?? "",
    p_name: invitee.name,
    p_email: invitee.email,
    p_answers: invitee.answers as unknown as never,
    p_ref: ref ?? undefined,
    p_booked_at: invitee.bookedAt ?? undefined,
  });

  if (error) {
    console.error("calendly: could not record the booking", error.message);
    return OK();
  }

  const leadId = typeof data === "string" ? data : null;
  if (!leadId) return OK();

  /**
   * Forwarding, after the response.
   *
   * record_booking is idempotent, so a retried delivery returns the same lead
   * id and creates no second event — but it would forward a second time, and
   * GA4 counts duplicates. The delivery row is keyed on (event_id,
   * destination), so the upsert collapses the retry into the first result.
   */
  after(
    forwardEvent({
      eventId: leadId,
      eventName: "generate_lead",
      occurredAt: invitee.bookedAt ?? new Date().toISOString(),
      // A booking arrives server-to-server: there is no browser, so no _ga
      // cookie and no session. GA4 will skip it for want of a client_id rather
      // than invent a user, and the skip is recorded with that reason.
      clientId: null,
      sessionId: null,
      pagePath: "/book",
      params: { form: "calendly", origin: "booking", has_ref: Boolean(ref) },
    }),
  );

  return OK();
}
