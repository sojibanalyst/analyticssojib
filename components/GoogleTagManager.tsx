import Script from "next/script";
import { getGtmContainerId } from "@/lib/settings";

/**
 * The GTM container script.
 *
 * Async, and reading the container id at REQUEST time rather than from a
 * build-time constant. That is the whole point of this file's current shape:
 * NEXT_PUBLIC_GTM_ID was inlined into the bundle when the site was built, so
 * changing containers meant a redeploy no matter what any settings form said.
 *
 * Renders nothing at all when there is no valid id — no script, no noscript,
 * no empty container reference. A malformed id is treated as absent, because
 * a container that silently never loads is worse than none: the page looks
 * instrumented and is not.
 */
/**
 * Where gtm.js is loaded from.
 *
 * NEXT_PUBLIC_SGTM_URL is the origin of the server-side container on this
 * site's own subdomain, for example https://sgtm.analyticssojib.com. When it
 * is set and well formed, the web container's script is requested from there
 * instead of from googletagmanager.com, so it is a first-party request.
 *
 * https only, and an origin only: no path, no query, no credentials. Anything
 * else falls back to Google's host, because a script URL built from a
 * malformed value is a script loaded from somewhere nobody chose.
 */
function gtmOrigin(): string {
  const fallback = "https://www.googletagmanager.com";
  const raw = (process.env.NEXT_PUBLIC_SGTM_URL ?? "").trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export async function GoogleTagManager() {
  const id = await getGtmContainerId();
  if (!id) return null;

  const origin = gtmOrigin();

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`window.dataLayer = window.dataLayer || [];
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='${origin}/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
    </Script>
  );
}

/** The <noscript> iframe, rendered immediately after <body>. */
export async function GoogleTagManagerNoScript() {
  const id = await getGtmContainerId();
  if (!id) return null;

  const origin = gtmOrigin();

  return (
    <noscript>
      <iframe
        src={`${origin}/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
