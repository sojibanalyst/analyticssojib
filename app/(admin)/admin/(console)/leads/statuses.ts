import type { Database } from "@/lib/supabase/types";

/**
 * The lead pipeline, in order.
 *
 * A plain module, not part of actions.ts, because a `"use server"` file may
 * only export async functions — everything it exports becomes a callable
 * server endpoint, so a constant there is a build error rather than a style
 * preference.
 */
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "booked",
  "won",
  "lost",
];
