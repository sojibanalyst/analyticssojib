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
export async function GoogleTagManager() {
  const id = await getGtmContainerId();
  if (!id) return null;

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`window.dataLayer = window.dataLayer || [];
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
    </Script>
  );
}

/** The <noscript> iframe, rendered immediately after <body>. */
export async function GoogleTagManagerNoScript() {
  const id = await getGtmContainerId();
  if (!id) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
