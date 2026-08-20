import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/auth";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  isMeaningful,
  mergeTouch,
  parseAttribution,
  serialiseAttribution,
  touchFromRequest,
} from "@/lib/attribution";

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
  // Public routes do one thing here and then leave: freeze attribution.
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return captureAttribution(request);
  }

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

/**
 * Attribution capture, server-side.
 *
 * The only thing that runs for a public request, and it never touches the
 * database, never awaits anything, and never makes a page dynamic — it reads
 * the URL and one header and may set one cookie. A static page stays static.
 *
 * It is here because it is the only place it CAN be. Public pages are
 * prerendered, so a server component cannot set a cookie during their render,
 * and reading the parameters in the browser and posting them back with the
 * form would make attribution a claim the page makes about itself.
 *
 * The cheap path is the common one: a returning visitor arriving on a plain
 * URL already has the cookie and nothing carries parameters, so this compares
 * two booleans and returns.
 */
function captureAttribution(request: NextRequest): NextResponse {
  const response = NextResponse.next({ request });

  const existing = parseAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
  const incoming = touchFromRequest(
    request.nextUrl,
    request.headers.get("referer"),
    request.nextUrl.host,
  );

  // Already recorded, and this request says nothing new. Most requests.
  if (existing && !isMeaningful(incoming)) return response;

  const merged = mergeTouch(existing, incoming, new Date().toISOString());

  // HttpOnly: no script on the page can read it, so nothing client-side can
  // report it back differently from what the server observed. Lax rather than
  // Strict because an ad click is a cross-site navigation — Strict would drop
  // the cookie on exactly the visits worth attributing.
  response.cookies.set(ATTRIBUTION_COOKIE, serialiseAttribution(merged), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: ATTRIBUTION_MAX_AGE,
  });

  return response;
}

export const config = {
  /**
   * /admin for the auth guard, and the public site for attribution capture.
   *
   * The public half is new, and it is a change to "no public page pays": it
   * now pays one middleware invocation. What it does not pay is a database
   * call, an await, or dynamic rendering — see captureAttribution. The
   * alternative was leaving every lead unattributed for ever, which is what
   * the site is for.
   *
   * Static assets, images and the collector are excluded: none of them is a
   * page anybody can arrive on.
   */
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|api/collect|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|ttf)).*)",
  ],
};
