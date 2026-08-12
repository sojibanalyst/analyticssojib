"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser client. Carries only the publishable key, which is safe to ship —
 * it is powerless on its own because every table is behind RLS.
 *
 * This never writes. All mutations go through a Server Action or Route
 * Handler, so the write path is auditable in one place on the server.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
