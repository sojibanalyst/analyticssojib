import Script from "next/script";
import { getGtmContainerId, getGtmHeadScripts } from "@/lib/settings";

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

/**
 * True everywhere except the tracking lab (/lab), which is a demo store for
 * practice and loads only a test container of its own. Checked in the
 * browser, so the root layout stays static: the site's real container never
 * runs on a lab page, and the lab's practice events never reach it.
 */
const NOT_LAB = "location.pathname.split('/')[1]!=='lab'";

/** A pasted external script, loaded the same way only off the lab. */
function loader(src: string): string {
  return `if(${NOT_LAB}){var s=document.createElement('script');s.async=true;s.src=${JSON.stringify(src)};document.head.appendChild(s);}`;
}

export async function GoogleTagManager() {
  // The snippet pasted on /admin/settings, exactly as GTM gave it. Plain
  // <script> elements so they run in <head> in the order pasted, below the
  // Consent Mode defaults the layout renders first.
  const pasted = await getGtmHeadScripts();
  if (pasted) {
    return (
      <>
        {pasted.scripts.map((script, i) =>
          <script
            key={i}
            dangerouslySetInnerHTML={{
              __html: "src" in script ? loader(script.src) : `if(${NOT_LAB}){
${script.inline}
}`,
            }}
          />,
        )}
      </>
    );
  }

  const id = await getGtmContainerId();
  if (!id) return null;

  const origin = gtmOrigin();

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`if(${NOT_LAB}){
window.dataLayer = window.dataLayer || [];
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='${origin}/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');
}`}
    </Script>
  );
}

/** The <noscript> iframe, rendered immediately after <body>. */
export async function GoogleTagManagerNoScript() {
  // With a pasted snippet the id comes from the snippet itself, when it has a
  // GTM-XXXX id in it; a custom loader without one gets no noscript frame.
  const pasted = await getGtmHeadScripts();
  const id = pasted ? pasted.containerId : await getGtmContainerId();
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
