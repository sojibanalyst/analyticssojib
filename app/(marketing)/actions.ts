"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { SESSION_COOKIE } from "@/lib/collector";
import {
  ATTRIBUTION_COOKIE,
  UNKNOWN_ATTRIBUTION,
  parseAttribution,
} from "@/lib/attribution";
import { clientIdFromGaCookie, findStreamCookie, sessionIdFromGaCookie } from "@/lib/forwarding/ga-cookies";
import { forwardEvent } from "@/lib/forwarding";
import { leadIdFrom } from "@/lib/lead-result";

/**
 * The public enquiry form's Server Action.
 *
 * It uses the ORDINARY client, not the service role. Everything it is allowed
 * to do is expressed by `submit_lead`, the one function anon may execute; if
 * that function is wrong, this cannot make it worse. Reaching for
 * getAdminClient() here would have been the shortcut.
 *
 * Being a Server Action rather than a route also keeps the page it lives on
 * static: actions are POST endpoints of their own and do not drag the
 * rendering of the page into dynamic.
 */

export type LeadState = {
  status: "idle" | "sent" | "error";
  message: string;
  /** Passed back so the browser can fire generate_lead with the same id. */
  eventId?: string;
};

const PLATFORMS = new Set([
  "shopify",
  "woocommerce",
  "custom",
  "other",
  "",
]);

const SENT_MESSAGE = "Thanks — I'll reply personally, usually within a day.";

const ERRORS: Record<string, string> = {
  name_invalid: "Please enter your name.",
  email_invalid: "That email address does not look right.",
  too_soon: "That looks like a duplicate — your first message is already in.",
};

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const platformRaw = String(formData.get("platform") ?? "").trim().toLowerCase();
  const platform = PLATFORMS.has(platformRaw) ? platformRaw : "other";
  const problem = String(formData.get("problem") ?? "").trim().slice(0, 4000);

  // The session cookie is HttpOnly, so only the server can read it. That is
  // also why attribution cannot be faked from the page: the browser never
  // sees, and never sends, the id it would need to lie about.
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value ?? null;

  /**
   * Attribution, read from the cookie the middleware froze — never from the
   * form. The field could say anything; the cookie is HttpOnly and was written
   * from the request URL and the Referer header on the visit itself.
   *
   * No cookie at all is "unknown", which is NOT "direct": the first means the
   * capture failed, the second means the first request was seen and carried
   * nothing. The Leads page shows them differently on purpose.
   */
  const attribution =
    parseAttribution(store.get(ATTRIBUTION_COOKIE)?.value) ?? UNKNOWN_ATTRIBUTION;

  const supabaseEarly = await createClient();

  /**
   * Honeypot — kept, but it no longer DISCARDS anything.
   *
   * A field a person never sees and a bot fills in. What it used to do was
   * return "Thanks, I'll reply personally" and insert nothing: no row, no
   * error, no log line. That is not a spam filter, it is a lead shredder, and
   * it took a real submission on the live site — a browser autofilling a field
   * labelled "Company website" is enough to trigger it.
   *
   * Now every refusal is written to lead_rejections and shown on /admin/leads.
   * The visitor still sees success, because telling a bot it was detected
   * teaches the bot; the difference is that the message is no longer the only
   * place the submission ever existed.
   */
  if (String(formData.get("company_website") ?? "")) {
    await supabaseEarly.rpc("record_lead_rejection", {
      p_reason: "honeypot",
      p_name: name,
      p_email: email,
      p_company: company || undefined,
      p_platform: platform || undefined,
      p_answers: problem ? { problem } : {},
      p_attribution: attribution as unknown as Json,
    });
    return { status: "sent", message: SENT_MESSAGE };
  }

  if (!name || !email.includes("@")) {
    // Recorded too: a validation refusal is still somebody who tried to reach
    // me, and "which field did people get wrong" is worth being able to ask.
    await supabaseEarly.rpc("record_lead_rejection", {
      p_reason: "invalid",
      p_name: name,
      p_email: email,
      p_company: company || undefined,
      p_platform: platform || undefined,
      p_answers: problem ? { problem } : {},
      p_attribution: attribution as unknown as Json,
    });
    return {
      status: "error",
      message: !name ? ERRORS.name_invalid : ERRORS.email_invalid,
    };
  }

  const supabase = supabaseEarly;
  const { data, error } = await supabase.rpc("submit_lead", {
    p_name: name,
    p_email: email,
    p_company: company || undefined,
    p_platform: platform || undefined,
    p_answers: problem ? { problem } : {},
    p_session_id: sessionId ?? undefined,
    // One call writes the lead, its attribution and its generate_lead event in
    // one transaction. Either all three exist or none does.
    p_attribution: attribution as unknown as Json,
  });

  if (error) {
    // Postgres raises the reason as the message; anything unrecognised gets a
    // generic reply rather than leaking the database's words to the page.
    const known = Object.keys(ERRORS).find((key) => error.message.includes(key));
    return {
      status: "error",
      message: known
        ? ERRORS[known]
        : "Something went wrong sending that. Email me directly and I'll pick it up.",
    };
  }

  /**
   * Success is only spoken after the row is CONFIRMED.
   *
   * submit_lead returns the new lead's uuid. No error and no uuid means the
   * insert did not happen, and the old code would still have said "Thanks,
   * I'll reply personally" — a lost lead wearing a success message, which is
   * the worst failure this form has because nothing looks broken.
   *
   * lib/lead-result.ts holds the rule so it can be tested; see the test that
   * fails if success can be returned without an id.
   */
  const eventId = leadIdFrom(data);
  if (!eventId) {
    return {
      status: "error",
      message:
        "That did not save. Nothing was recorded, so please email me directly " +
        "rather than assuming it arrived.",
    };
  }

  /**
   * Server-side forwarding, after the visitor has their answer.
   *
   * `after()` runs this once the response has been sent, so a slow GA4 cannot
   * make a person wait and a failing GA4 cannot turn a saved lead into an
   * error message. forwardEvent never throws for the same reason.
   *
   * Here rather than on a schedule because this is the moment the lead is
   * CONFIRMED — the row exists, the id is final. A cron would have to
   * rediscover both, and would forward things the database later rejected.
   *
   * The event row itself is NOT written here — submit_lead wrote it in the
   * same transaction as the lead, with the same id. This only delivers it.
   *
   * The browser does not send generate_lead to /api/collect any more, and must
   * not fire a GA4 tag on it in GTM: GA4 counts duplicates rather than
   * resolving them. See components/sections/LeadForm.tsx.
   */
  {
    const all = store.getAll().map((c) => ({ name: c.name, value: c.value }));
    const ga = all.find((c) => c.name === "_ga")?.value ?? null;

    after(
      forwardEvent({
        eventId,
        eventName: "generate_lead",
        occurredAt: new Date().toISOString(),
        clientId: clientIdFromGaCookie(ga),
        // The measurement id lives on the destination row, which this action
        // does not read; with one stream cookie that is unambiguous anyway.
        sessionId: sessionIdFromGaCookie(findStreamCookie(all, null)),
        pagePath: attribution.last.landing_page ?? attribution.first.landing_page,
        params: { form: "contact", platform, has_problem: Boolean(problem) },
      }),
    );
  }

  return { status: "sent", message: SENT_MESSAGE, eventId };
}
