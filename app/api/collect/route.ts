import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/types";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  attributionFrom,
  deviceTypeFrom,
  parseEnvelope,
} from "@/lib/collector";

/**
 * The collector.
 *
 * A first-party endpoint on the site's own origin, which is the point: it is
 * not blocked by content blockers or capped by ITP the way a third-party
 * request would be, and the session cookie it sets is first-party too.
 *
 * It uses the service-role client — one of only two places allowed to, the
 * other being the fan-out worker. Visitors have no Supabase session, so RLS
 * would deny every write; there is no policy that would let a browser write to
 * `events` directly, and there should not be.
 *
 * It always answers 204, even when it rejects the payload. A collector that
 * reports its own failures to the page teaches an attacker the shape of the
 * validator and tells an ordinary visitor nothing they can act on.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CONTENT = new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  let envelope;
  try {
    envelope = parseEnvelope(await request.json());
  } catch {
    return NO_CONTENT;
  }
  if (!envelope) return NO_CONTENT;

  // No service role key: a local run, or a preview deployment, which is not
  // given one on purpose so it cannot write production tracking data. Answer
  // 204 rather than 500 — the page is not broken, it just is not collecting,
  // and a beacon has nobody to report an error to anyway.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("collector: no SUPABASE_SERVICE_ROLE_KEY, event discarded");
    return NO_CONTENT;
  }

  // "granted" and nothing else. With the banner removed every event arrives as
  // not_asked, so this is false on every request and no session identifier is
  // created — which is the correct outcome, not a regression: nobody has been
  // asked, so nobody has agreed to be identified across pageviews. Events are
  // still recorded, with session_id null and the honest consent value on the
  // row. Wire a CMP back in (see lib/consent.ts) and sessions resume by
  // themselves, with no change here.
  const analyticsAllowed = envelope.consent.analytics_storage === "granted";

  // Existing session, if the visitor has one and still allows it.
  const cookieSid = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const sessionId =
    analyticsAllowed && cookieSid ? cookieSid : analyticsAllowed ? crypto.randomUUID() : null;

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  if (sessionId) {
    const attribution = attributionFrom(envelope.page_path, envelope.referrer);
    const userAgent = request.headers.get("user-agent") ?? "";

    // first_touch_* is written once and never overwritten; last_touch_* is
    // rewritten every visit. `ignoreDuplicates` on the insert is what makes
    // that true — the first row wins, and the update below only ever touches
    // the last_touch columns.
    const inserted = await supabase.from("sessions").insert(
      {
        session_id: sessionId,
        first_seen_at: now,
        last_seen_at: now,
        first_touch_source: attribution.source,
        first_touch_medium: attribution.medium,
        first_touch_campaign: attribution.campaign,
        first_touch_term: attribution.term,
        first_touch_content: attribution.content,
        last_touch_source: attribution.source,
        last_touch_medium: attribution.medium,
        last_touch_campaign: attribution.campaign,
        last_touch_term: attribution.term,
        last_touch_content: attribution.content,
        landing_page: envelope.page_path,
        referrer: envelope.referrer,
        gclid: attribution.gclid,
        fbclid: attribution.fbclid,
        ttclid: attribution.ttclid,
        msclkid: attribution.msclkid,
        user_agent: userAgent,
        device_type: deviceTypeFrom(userAgent),
        country: request.headers.get("x-vercel-ip-country"),
        consent: envelope.consent,
      },
      // The session already existing is the normal case, not an error.
      { count: "exact" },
    );

    if (inserted.error) {
      // Duplicate primary key: a returning visitor. Refresh what should move.
      const update: TablesUpdate<"sessions"> = {
        last_seen_at: now,
        consent: envelope.consent,
      };

      // Only overwrite last-touch when this request actually said where the
      // visitor came from. A visitor who lands from Google and then loads a
      // second page has not become "direct", and recording that would erase
      // the campaign that found them.
      //
      // Testing `attribution.source` here does NOT work — it is never null,
      // because "direct" is the fallback. That was the bug: production showed
      // a session whose first touch was a campaign and whose last touch had
      // been overwritten to direct by the very next pageview.
      if (!attribution.isDirect) {
        update.last_touch_source = attribution.source;
        update.last_touch_medium = attribution.medium;
        update.last_touch_campaign = attribution.campaign;
        update.last_touch_term = attribution.term;
        update.last_touch_content = attribution.content;
      }
      // Click ids persist for the session: someone who arrived on ?gclid= and
      // converts three pages later still converted because of that click.
      if (attribution.gclid) update.gclid = attribution.gclid;
      if (attribution.fbclid) update.fbclid = attribution.fbclid;
      if (attribution.ttclid) update.ttclid = attribution.ttclid;
      if (attribution.msclkid) update.msclkid = attribution.msclkid;

      await supabase.from("sessions").update(update).eq("session_id", sessionId);
    }
  }

  // event_id is UNIQUE, so a replayed or retried beacon collapses into the row
  // that is already there instead of counting twice.
  const { error } = await supabase.from("events").insert({
    session_id: sessionId,
    event_name: envelope.event_name,
    event_id: envelope.event_id,
    occurred_at: envelope.occurred_at,
    page_path: envelope.page_path,
    params: envelope.params,
    consent: envelope.consent,
  });

  // A duplicate event_id is success, not failure — that is deduplication
  // working. Anything else is worth knowing about in the platform logs.
  if (error && error.code !== "23505") {
    console.error("collector: event insert failed", error.message);
  }

  const response = new NextResponse(null, { status: 204 });

  if (sessionId) {
    // Rolling: every event extends the session. HttpOnly because nothing in
    // the browser needs to read it, and that keeps it out of reach of any
    // script that ends up on the page.
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } else if (cookieSid) {
    // Consent was withdrawn. Drop the identifier rather than letting it sit
    // there unused — an unused tracking cookie is still a tracking cookie.
    response.cookies.delete(SESSION_COOKIE);
  }

  return response;
}
