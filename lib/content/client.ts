import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Read-only Supabase client for public content, used at BUILD time.
 *
 * Two things keep the marketing site static:
 *
 *  1. It is the plain supabase-js client, not the cookie-bound one from
 *     lib/supabase/server.ts. Touching cookies would make every page that
 *     reads content dynamic, and public pages must stay ○ or ●.
 *
 *  2. Every request it makes is a cached GET, tagged so P6 can invalidate it
 *     on publish. PostgREST selects are GETs, which is what makes this work.
 *
 * It uses the publishable key, so RLS applies: it can only ever see rows the
 * public is allowed to see. A draft post is invisible to it by policy, not by
 * a `where` clause someone might forget.
 */
export const CONTENT_TAG = "content";

/**
 * An hour. Content changes rarely and P6 revalidates on publish, so this is
 * only the backstop for a change made directly in the database.
 */
export const CONTENT_REVALIDATE = 3600;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The marketing pages read their content from ` +
        "Supabase at build time, so the build cannot produce a correct site " +
        "without it. Failing loudly beats shipping a site with no case studies.",
    );
  }
  return value;
}

const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    next: { revalidate: CONTENT_REVALIDATE, tags: [CONTENT_TAG] },
  });

let client: ReturnType<typeof createClient<Database>> | null = null;

export function contentClient() {
  if (!client) {
    client = createClient<Database>(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: cachedFetch },
      },
    );
  }
  return client;
}

/**
 * Every content read goes through here.
 *
 * It throws rather than returning an empty array, and that is the whole point.
 * A failed read that degrades to `[]` publishes a page with its case studies
 * missing and no error anywhere — precisely the class of silent data loss this
 * site exists to argue against.
 */
export function orThrow<T>(
  what: string,
  { data, error }: { data: T | null; error: { message: string } | null },
): T {
  if (error) throw new Error(`Reading ${what} from Supabase failed: ${error.message}`);
  if (data === null) throw new Error(`Reading ${what} from Supabase returned nothing.`);
  return data;
}
