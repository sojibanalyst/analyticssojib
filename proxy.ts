import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/auth";

/**
 * Guards /admin/* and keeps the auth session fresh.
 *
 * This is the file Next.js 16 renamed from `middleware.ts` to `proxy.ts`.
 * Same behaviour, same signature — the old name now logs a deprecation
 * warning on every build.
 *
 * Two rules:
 *  - No session, or a session whose email is not allowlisted → /admin/login.
 *  - Already signed in and allowlisted → /admin/login sends you to /admin.
 *
 * A signed-in but NOT allowlisted user is signed out here rather than merely
 * redirected. Supabase will create an auth user for anyone who requests a
 * link, so without this they would sit in a redirect loop holding a valid
 * session forever.
 *
 * This is an optimistic check, not the authorisation boundary. The real ones
 * are the layout guard in app/(admin)/admin/(console)/layout.tsx and the RLS
 * policies in the database, which hold even if this file never runs.
 *
 * The matcher deliberately excludes the marketing site: no public page pays
 * the cost of this, which protects the TTFB budget.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates against Supabase. getSession() only reads the
  // cookie, which is forgeable — never use it to gate access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onLoginRoute = pathname.startsWith("/admin/login");
  const allowed = isAllowedEmail(user?.email);

  if (user && !allowed) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(url);
  }

  if (!allowed && !onLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (allowed && onLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // /admin and everything under it. The auth callback is excluded because it
  // has to run before a session exists.
  matcher: ["/admin/:path*"],
};
