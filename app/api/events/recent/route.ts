import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * The public read behind "This site, tracked live".
 *
 * Returns the latest events from this site's own collector as three fields
 * each: the event name, the page path, and when. Nothing else exists in the
 * response because nothing else exists in what it reads from.
 *
 * THE PRIVACY IS IN THE DATABASE, NOT HERE. This handler selects from the
 * `public_recent_events` view with the publishable key, the same key that is
 * in every visitor's browser. The view (migration 20261013000001) is what
 * limits the columns, strips query strings, and allowlists names and paths.
 * So there is no service-role client in this file, and nothing this code
 * could get wrong would expose a session id, an event id or a parameter:
 * the role it runs as cannot read them.
 *
 * CACHED FOR TEN SECONDS, twice. The Supabase read is a cached fetch, and the
 * response carries s-maxage so the CDN answers most requests without running
 * this at all. A panel that polls every ten seconds from every open tab is
 * then one database read per ten seconds, not one per visitor.
 *
 * RATE LIMITED, best effort. Thirty requests a minute per address. The count
 * lives in this instance's memory, so on a platform that runs several
 * instances the real ceiling is that many times higher. It is a guard against
 * a runaway loop, not a security boundary; the cache is what carries the load.
 */
export const runtime = "nodejs";

const CACHE_SECONDS = 10;
const LIMIT = 30;
const WINDOW_MS = 60_000;
const MAX_TRACKED = 5_000;

type RecentEvent = { event_name: string; page_path: string; at: string };

const hits = new Map<string, { count: number; reset: number }>();

function allow(key: string, now: number): boolean {
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    // Bounded, so a flood of distinct addresses cannot grow this for ever.
    if (hits.size >= MAX_TRACKED) hits.clear();
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
}

const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: CACHE_SECONDS } });

const HEADERS = {
  "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 3}`,
  "X-Robots-Tag": "noindex",
};

export async function GET(request: NextRequest) {
  // Only used as a counter key, in memory, for a minute. Never stored.
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!allow(address, Date.now())) {
    return NextResponse.json(
      { events: [] },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ events: [] }, { headers: HEADERS });

  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: cachedFetch },
    });

    const { data, error } = await supabase
      .from("public_recent_events")
      .select("event_name, page_path, at")
      .limit(12);

    if (error || !data) return NextResponse.json({ events: [] }, { headers: HEADERS });

    // Named fields, copied one by one. If a column is ever added to the view,
    // it still does not reach the response until someone adds it here too.
    const events: RecentEvent[] = [];
    for (const row of data) {
      if (!row.event_name || !row.page_path || !row.at) continue;
      events.push({ event_name: row.event_name, page_path: row.page_path, at: row.at });
    }

    return NextResponse.json({ events }, { headers: HEADERS });
  } catch {
    // A panel with nothing in it is the right failure. The page is not broken.
    return NextResponse.json({ events: [] }, { headers: HEADERS });
  }
}
