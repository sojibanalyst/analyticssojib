import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * `import "server-only"` at the top is the guard that matters: importing this
 * from a client component is a build error, not a runtime surprise. CI also
 * greps .next/static for the key so a leak fails the build rather than
 * shipping.
 *
 * Only two things legitimately need this: the collector writing events for
 * anonymous visitors, and the fan-out worker updating delivery rows. Anything
 * a signed-in admin does should go through the request-scoped client in
 * server.ts so policies still apply.
 */
export function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It belongs in Vercel project env vars, never in the repo.",
    );
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
