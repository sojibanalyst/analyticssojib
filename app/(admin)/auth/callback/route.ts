import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link lands. Exchanges the one-time code for a session
 * cookie, then re-checks the allowlist before letting anyone through.
 *
 * The re-check is not redundant with the middleware. A link is valid for an
 * hour; if an address is removed from the allowlist in that window, the link
 * still exchanges successfully, and this is the point where that session is
 * thrown away instead of parked in a cookie.
 *
 * It sits OUTSIDE the /admin/:path* matcher on purpose — the middleware would
 * bounce it to the login page before the code could ever be exchanged.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/admin";
  const next =
    nextParam.startsWith("/admin") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/admin/login?error=${reason}`);

  if (!code) return fail("missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("expired");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedEmail(user?.email)) {
    await supabase.auth.signOut();
    return fail("not_allowed");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
