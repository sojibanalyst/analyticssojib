import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, UNKNOWN_ATTRIBUTION, parseAttribution } from "@/lib/attribution";
import { newBookingRef } from "@/lib/booking-ref";
import { getAdminClient } from "@/lib/supabase/admin";
import { site } from "@/content/site";

/**
 * /book — the click id stays on this side of the handoff.
 *
 * Calendly's tracking object has exactly six fields: utm_source, utm_medium,
 * utm_campaign, utm_content, utm_term, salesforce_uuid. There is no gclid
 * field and there is not going to be one, so a booking made by clicking
 * straight through to calendly.com can never carry the click id that Google
 * Ads offline conversion import requires. The most valuable conversion on the
 * site would be structurally unable to prove where it came from.
 *
 * So the attribution never leaves: it is written here, against a short opaque
 * reference, and Calendly is handed the reference in utm_content. The webhook
 * joins it back.
 *
 * The reference is opaque ON PURPOSE. Putting the raw gclid in utm_content
 * would work and would be a mistake: it would sit in a third party's database
 * and in a URL, where it is worth nothing to us and something to somebody
 * else. A random id identifies the row and says nothing about the person.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where to send someone when there is nothing better to do. */
function calendlyUrl(): string {
  return site.calendly;
}

export async function GET(request: NextRequest) {
  const target = new URL(calendlyUrl());

  const attribution =
    parseAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value) ?? UNKNOWN_ATTRIBUTION;

  // The five UTMs Calendly does keep, so a booking is still legible inside
  // Calendly itself without opening this console.
  const touch = attribution.last.source ? attribution.last : attribution.first;
  if (touch.source) target.searchParams.set("utm_source", touch.source);
  if (touch.medium) target.searchParams.set("utm_medium", touch.medium);
  if (touch.campaign) target.searchParams.set("utm_campaign", touch.campaign);
  if (touch.term) target.searchParams.set("utm_term", touch.term);

  const ref = newBookingRef();

  /**
   * Storing the intent is best-effort, and the redirect is not.
   *
   * If the database is unreachable, the visitor still reaches Calendly and
   * still books; the booking arrives later with no reference and is recorded
   * with attribution "unknown", which is the honest outcome. Blocking a
   * booking to preserve a marketing parameter would be the wrong trade in
   * every direction.
   */
  let stored = false;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getAdminClient();
      const { error } = await supabase.from("booking_intents").insert({
        ref,
        attribution: attribution as unknown as never,
        landing_page: touch.landing_page,
        referrer: touch.referrer,
      });
      stored = !error;
      if (error) console.error("book: could not store the intent", error.message);
    }
  } catch (error) {
    console.error("book: could not store the intent", (error as Error).message);
  }

  // utm_content carries the reference, and only when there is a row for it to
  // point at. A reference to nothing would send the webhook looking for a row
  // that does not exist and make "no reference" ambiguous.
  if (stored) target.searchParams.set("utm_content", ref);

  /**
   * Two callers, one route.
   *
   * A plain navigation gets a 302 — that is the path a modified click, a
   * middle click and a browser with no JavaScript all take, and it is why the
   * anchor's href is /book rather than calendly.com.
   *
   * ?format=json is the popup widget: it opens Calendly in a modal rather than
   * navigating, so it needs the URL rather than a redirect. Same row, same
   * reference, same reasoning — the only difference is who does the opening.
   */
  if (request.nextUrl.searchParams.get("format") === "json") {
    return NextResponse.json(
      { url: target.toString(), ref: stored ? ref : null },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  // 302, not 308: this is a lookup that mints a new reference every time, and
  // it must never be cached by a browser or an intermediary.
  return NextResponse.redirect(target.toString(), {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
