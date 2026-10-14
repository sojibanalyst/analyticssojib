import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

import {
  combine,
  isBlockedAddress,
  normaliseTarget,
  scanContainer,
  scanPage,
  type Findings,
} from "@/lib/tracking-check";

/**
 * The free tracking check.
 *
 * POST { url }. Fetches that page's HTML and reports what tracking is visible
 * in it. When the page loads a GTM container, the container script is fetched
 * too, once, through exactly the same fence, and what is configured inside it
 * is reported separately: most tags on a well-built site live there, not in
 * the HTML.
 *
 * THIS ROUTE FETCHES A URL CHOSEN BY A STRANGER, so most of it is the fence:
 *
 *   - http and https only, default ports only, no credentials in the URL
 *     (lib/tracking-check.ts, normaliseTarget).
 *   - The hostname is resolved HERE, every address it resolves to is checked,
 *     and if any one of them is private, loopback, link-local or otherwise not
 *     the public internet, the request is refused. Any, not all: a name that
 *     answers with one public and one private address is exactly what an
 *     attacker would set up.
 *   - The connection is then made to the address that was checked, by handing
 *     the HTTP client a lookup function that returns it. The name is not
 *     resolved a second time, so the answer cannot change between the check
 *     and the connection.
 *   - Redirects are not followed by the client. Each one comes back here and
 *     goes through the same checks, and there are at most four.
 *   - Six seconds for the page and six more for the container, and the body is
 *     cut off at 1.5 MB for a page and 3 MB for a container.
 *   - Only an HTML response is read as the page, and only a JavaScript
 *     response as the container. The container URL comes from the page, so it
 *     goes through every check above as if a visitor had typed it.
 *
 * NOTHING ABOUT THE REQUEST IS KEPT. The URL is not logged and not stored, and
 * the address used for rate limiting lives in memory for a minute.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 6_000;
const MAX_PAGE_BYTES = 1_500_000;
/** A GTM container is often 300 to 600 kB; a big one is past a megabyte. */
const MAX_SCRIPT_BYTES = 3_000_000;
const MAX_REDIRECTS = 4;

const PER_ADDRESS = 6;
const GLOBAL = 60;
const WINDOW_MS = 60_000;

type Failure = "invalid_url" | "blocked" | "unreachable" | "not_html" | "rate_limited";

const hits = new Map<string, { count: number; reset: number }>();

function allow(key: string, limit: number, now: number): boolean {
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    if (hits.size >= 5_000) hits.clear();
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

function fail(error: Failure, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

type Pinned = { address: string; family: 4 | 6 };

/** The address to connect to, or null if the host may not be reached. */
async function resolvePublic(hostname: string): Promise<Pinned | null> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  if (literal) {
    const family = literal === 6 ? 6 : 4;
    return isBlockedAddress(host, family) ? null : { address: host, family };
  }

  let answers: { address: string; family: number }[];
  try {
    answers = await lookup(host, { all: true });
  } catch {
    return null;
  }
  if (!answers.length) return null;

  const pinned: Pinned[] = answers.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 }));
  if (pinned.some((a) => isBlockedAddress(a.address, a.family))) return null;
  // IPv4 first where there is one; not every host this runs on has IPv6 out.
  return pinned.find((a) => a.family === 4) ?? pinned[0];
}

/** What a request is for: decides the accepted content type and the size cap. */
type Want = "page" | "script";

const ACCEPT: Record<Want, string> = {
  page: "text/html,application/xhtml+xml;q=0.9",
  script: "application/javascript,text/javascript;q=0.9",
};
const TYPE: Record<Want, RegExp> = {
  page: /\b(?:text\/html|application\/xhtml\+xml)\b/i,
  script: /\b(?:application|text)\/(?:x-)?(?:javascript|ecmascript)\b/i,
};
const CAP: Record<Want, number> = { page: MAX_PAGE_BYTES, script: MAX_SCRIPT_BYTES };

type Fetched =
  | { kind: "body"; body: string }
  | { kind: "redirect"; location: string }
  | { kind: "wrong_type" }
  | { kind: "error" };

/** One request, to one already-checked address, with redirects left alone. */
function fetchPinned(url: URL, pinned: Pinned, deadline: number, want: Want): Promise<Fetched> {
  return new Promise((resolve) => {
    const client = url.protocol === "https:" ? https : http;
    let settled = false;
    const done = (value: Fetched) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.destroy();
      resolve(value);
    };

    const request = client.request(
      url,
      {
        method: "GET",
        // The whole point: connect to the address that was checked.
        lookup: (_host, options, callback) => {
          if (typeof options === "object" && options.all) {
            (callback as (e: null, a: { address: string; family: number }[]) => void)(null, [pinned]);
          } else {
            (callback as (e: null, a: string, f: number) => void)(null, pinned.address, pinned.family);
          }
        },
        headers: {
          // Says what it is. A site that does not want to be checked can refuse it.
          "User-Agent": "analyticssojib-tracking-check/1.0 (+https://analyticssojib.com)",
          Accept: ACCEPT[want],
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          return done({ kind: "redirect", location: response.headers.location });
        }
        if (status < 200 || status >= 300) {
          response.resume();
          return done({ kind: "error" });
        }
        if (!TYPE[want].test(String(response.headers["content-type"] ?? ""))) {
          response.resume();
          return done({ kind: "wrong_type" });
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          // Stop reading rather than fail. A page's tags are near the top; a
          // container cut short still has its configuration, which comes first.
          if (size >= CAP[want]) done({ kind: "body", body: Buffer.concat(chunks).toString("utf8") });
        });
        response.on("end", () => done({ kind: "body", body: Buffer.concat(chunks).toString("utf8") }));
        response.on("error", () => done({ kind: "error" }));
      },
    );

    const timer = setTimeout(() => done({ kind: "error" }), Math.max(0, deadline - Date.now()));
    request.on("error", () => done({ kind: "error" }));
    request.end();
  });
}

type Outcome = { ok: true; url: URL; body: string } | { ok: false; error: Failure; status: number };

/**
 * Fetches a URL through the whole fence: resolved, every address checked,
 * connection pinned, redirects followed here (four at most) with each hop
 * normalised and checked again.
 */
async function fetchFenced(start: URL, want: Want, deadline: number): Promise<Outcome> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const pinned = await resolvePublic(url.hostname);
    if (!pinned) return { ok: false, error: "blocked", status: 400 };

    const result = await fetchPinned(url, pinned, deadline, want);

    if (result.kind === "redirect") {
      let next: URL | null = null;
      try {
        next = normaliseTarget(new URL(result.location, url).href);
      } catch {
        next = null;
      }
      if (!next) return { ok: false, error: "blocked", status: 400 };
      url = next;
      continue;
    }
    if (result.kind === "wrong_type") return { ok: false, error: "not_html", status: 422 };
    if (result.kind === "error") return { ok: false, error: "unreachable", status: 502 };
    return { ok: true, url, body: result.body };
  }
  return { ok: false, error: "unreachable", status: 502 };
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allow(`a:${address}`, PER_ADDRESS, now) || !allow("global", GLOBAL, now)) {
    return fail("rate_limited", 429);
  }

  let input: unknown;
  try {
    input = (await request.json())?.url;
  } catch {
    return fail("invalid_url", 400);
  }
  if (typeof input !== "string") return fail("invalid_url", 400);

  const target = normaliseTarget(input);
  if (!target) return fail("invalid_url", 400);

  const page = await fetchFenced(target, "page", now + TIMEOUT_MS);
  if (!page.ok) return fail(page.error, page.status);

  const scanned = scanPage(page.body, page.url);

  // The second pass. The container URL came out of a stranger's page, so it is
  // normalised and fenced exactly like the address the visitor typed. If it
  // cannot be reached, the page result still stands on its own.
  let inContainer: Findings | null = null;
  let containerRead = false;
  const containerUrl = scanned.container?.url ? normaliseTarget(scanned.container.url) : null;
  if (containerUrl) {
    const script = await fetchFenced(containerUrl, "script", Date.now() + TIMEOUT_MS);
    if (script.ok) {
      inContainer = scanContainer(script.body);
      containerRead = true;
    } else {
      // The kind of failure only, never the URL: enough to see in the
      // platform logs why containers are not being read, nothing about whose.
      console.warn("tracking-check: container not read:", script.error);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      // The host only, not the full URL: the path and query are the visitor's
      // business and the result does not need them.
      host: page.url.hostname,
      container: scanned.container
        ? {
            id: scanned.container.id,
            host: scanned.container.host,
            custom: scanned.container.custom,
            read: containerRead,
          }
        : null,
      results: combine(scanned.findings, inContainer),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
