/**
 * The destination adapter contract.
 *
 * One shape for all five platforms, so Meta, Google Ads, TikTok and sGTM slot
 * in later without the orchestrator learning anything about them. Only GA4 is
 * implemented today; the others are unwritten files, not unwritten concepts.
 *
 * The four steps are deliberately separate:
 *
 *   canHandle     may this event go to this destination AT ALL
 *   transform     event + config → the platform's payload
 *   send          one HTTP request, no retries, no side effects
 *   recordResult  what happened, written to the database
 *
 * canHandle is its own step because the answer is a fact about the platform,
 * not about the request. GA4 does not deduplicate by event_id the way Meta and
 * TikTok do, so an event sent from both the browser and the Measurement
 * Protocol is COUNTED TWICE. Which events may be forwarded is therefore a rule
 * the adapter enforces in code, and a "skipped" with a reason is a normal,
 * recorded outcome rather than an error.
 */

/** Everything an adapter may know about the event being forwarded. */
export type ForwardEvent = {
  /** The one id shared by the browser push and the server. */
  eventId: string;
  eventName: string;
  /** ISO 8601. GA4 rejects anything older than 72 hours. */
  occurredAt: string;
  /** From the _ga cookie, if the visitor has one. */
  clientId: string | null;
  /** From the _ga_<STREAM> cookie, if the visitor has one. */
  sessionId: string | null;
  pagePath: string | null;
  params: Record<string, string | number | boolean | null>;
};

export type ForwardStatus = "sent" | "skipped" | "failed";

export type ForwardOutcome = {
  status: ForwardStatus;
  /** Written to the delivery row and shown as LAST RESULT. Redacted. */
  message: string;
  /** HTTP status, when a request was actually made. */
  responseCode?: number;
};

export type DestinationConfig = Record<string, string>;

export type DestinationAdapter = {
  /** Matches destinations.key. */
  key: string;

  /**
   * Whether this event may be forwarded here. Returning a reason rather than
   * false alone: "skipped" is recorded, and a skip with no explanation is
   * indistinguishable from a bug three weeks later.
   */
  canHandle(
    event: ForwardEvent,
    config: DestinationConfig,
  ): { ok: true } | { ok: false; reason: string };

  /** The platform's payload. Pure — no clock, no network, so it can be tested. */
  transform(event: ForwardEvent, config: DestinationConfig): unknown;

  /**
   * One request. No retries here: a retry policy belongs to the caller, which
   * knows whether it is running inside a visitor's request.
   */
  send(
    payload: unknown,
    config: DestinationConfig,
    secret: string,
  ): Promise<ForwardOutcome>;
};
