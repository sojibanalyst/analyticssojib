/**
 * Who is allowed into /admin.
 *
 * One allowlisted address. Anyone else can request a magic link and will even
 * receive one — Supabase will happily create the auth user — but this check
 * is what decides whether they get past the door, and the RLS policies repeat
 * the same rule in the database so a mistake in the app layer cannot expose a
 * single row.
 *
 * Kept free of next/headers and the Supabase SDK so it can be imported from
 * middleware, server components and tests alike.
 */
export const ADMIN_EMAILS = ["sojibh2001@gmail.com"] as const;

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalised = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalised);
}
