import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getDestinationSecret } from "@/lib/secrets";
import { redactSecrets } from "@/lib/redact";
import { ga4Adapter } from "./ga4";
import type { DestinationAdapter, DestinationConfig, ForwardEvent, ForwardOutcome } from "./types";

/**
 * The fan-out worker.
 *
 * Adapters register here and nowhere else. Adding Meta is a file plus a line in
 * this array; the orchestration below never learns what a pixel is.
 */
const ADAPTERS: DestinationAdapter[] = [ga4Adapter];

/**
 * Service role, deliberately.
 *
 * This is the second of the two paths allowed to use it, the collector being
 * the first. It writes delivery rows for a visitor who has no session, and it
 * decrypts a credential — neither is possible through a policy, and neither
 * should be.
 */

/**
 * Forward one event to every destination that will take it.
 *
 * NEVER throws. This is called from inside the enquiry form's server action
 * after the lead is already committed, so anything thrown here would turn a
 * saved lead into an error message for a visitor who did nothing wrong. Every
 * failure is recorded and swallowed.
 */
export async function forwardEvent(event: ForwardEvent): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

    const supabase = getAdminClient();

    // The delivery row references events.id, so the event has to exist as a
    // row first. Inserting it here rather than waiting for the browser's beacon
    // is what makes a server-confirmed event server-recorded: event_id is
    // unique, so if the browser also posts this one it collapses into this row
    // instead of creating a second.
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("event_id", event.eventId)
      .maybeSingle();

    let eventRowId = existing?.id ?? null;

    if (!eventRowId) {
      const { data: inserted, error: insertError } = await supabase
        .from("events")
        .insert({
          event_name: event.eventName,
          event_id: event.eventId,
          occurred_at: event.occurredAt,
          page_path: event.pagePath,
          params: event.params,
        })
        .select("id")
        .maybeSingle();

      if (insertError && insertError.code !== "23505") {
        console.error("forwarding: could not record the event", insertError.message);
        return;
      }

      eventRowId =
        inserted?.id ??
        (
          await supabase
            .from("events")
            .select("id")
            .eq("event_id", event.eventId)
            .maybeSingle()
        ).data?.id ??
        null;
    }

    if (!eventRowId) return;

    const { data: destinations } = await supabase
      .from("destinations")
      .select("key, enabled, config")
      .in(
        "key",
        ADAPTERS.map((a) => a.key),
      );

    for (const adapter of ADAPTERS) {
      const row = destinations?.find((d) => d.key === adapter.key);
      if (!row) continue;

      const config = (row.config ?? {}) as DestinationConfig;
      const outcome = await runAdapter(adapter, event, config, row.enabled);
      await recordResult(eventRowId, adapter.key, outcome);
    }
  } catch (error) {
    // The visitor's lead is already saved. Nothing that happens here is worth
    // surfacing to them, and nothing here may be allowed to escape.
    console.error("forwarding: unhandled", (error as Error).message);
  }
}

async function runAdapter(
  adapter: DestinationAdapter,
  event: ForwardEvent,
  config: DestinationConfig,
  enabled: boolean,
): Promise<ForwardOutcome> {
  if (!enabled) {
    return {
      status: "skipped",
      message: `${adapter.key} is switched off on /admin/destinations.`,
    };
  }

  const verdict = adapter.canHandle(event, config);
  if (!verdict.ok) return { status: "skipped", message: verdict.reason };

  const { value: secret } = await getDestinationSecret(adapter.key);
  if (!secret) {
    return {
      status: "skipped",
      message: `No credential stored for ${adapter.key}, so nothing was sent.`,
    };
  }

  try {
    return await adapter.send(adapter.transform(event, config), config, secret);
  } catch (error) {
    return {
      status: "failed",
      message: redactSecrets(`${adapter.key} threw: ${(error as Error).message}`, secret),
    };
  }
}

/**
 * What happened, written down.
 *
 * Two places, because they answer two questions: the delivery row is the
 * per-event record the SENT / SKIPPED / FAILED counters are derived from, and
 * the destination row carries LAST RESULT — the one line you read when asking
 * "is this working right now".
 */
async function recordResult(
  eventRowId: string,
  destination: string,
  outcome: ForwardOutcome,
): Promise<void> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  await supabase.from("event_deliveries").upsert(
    {
      event_id: eventRowId,
      destination,
      status: outcome.status,
      attempt_count: 1,
      response_code: outcome.responseCode ?? null,
      response_body: outcome.status === "sent" ? outcome.message.slice(0, 500) : null,
      skipped_reason: outcome.status === "skipped" ? outcome.message.slice(0, 500) : null,
      sent_at: outcome.status === "sent" ? now : null,
    },
    { onConflict: "event_id,destination" },
  );

  // A skip is not a failure and must not light the destination up red — it is
  // the system declining to send something on purpose, and the reason is on
  // the delivery row for anyone who asks.
  if (outcome.status === "sent") {
    await supabase
      .from("destinations")
      .update({ last_ok_at: now, last_error: null, last_error_at: null })
      .eq("key", destination);
  } else if (outcome.status === "failed") {
    await supabase
      .from("destinations")
      .update({ last_error_at: now, last_error: outcome.message.slice(0, 500) })
      .eq("key", destination);
  }
}

export type { ForwardEvent } from "./types";
