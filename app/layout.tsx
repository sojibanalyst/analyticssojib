import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { site } from "@/content/site";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/GoogleTagManager";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.role}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.domain,
  authors: [{ name: site.fullName, url: site.url }],
  creator: site.fullName,
  keywords: [
    "GA4",
    "Google Analytics 4",
    "Google Tag Manager",
    "server-side tagging",
    "server-side GTM",
    "Meta Conversions API",
    "Meta CAPI",
    "Google Ads enhanced conversions",
    "conversion tracking",
    "Looker Studio",
    "analytics consultant",
  ],
  // No canonical here. Declared in the root layout it was inherited by every
  // route that did not set its own, so /admin and /book both told crawlers
  // they were the homepage. Each public page declares its own; the homepage's
  // is in app/(marketing)/page.tsx.
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.domain,
    title: `${site.name} | ${site.role}`,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitterHandle,
    creator: site.twitterHandle,
    title: `${site.name} | ${site.role}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // The manifest link is emitted automatically from app/manifest.ts.
};

export const viewport: Viewport = {
  // One colour, not a light/dark pair keyed on the operating system: the theme
  // is the visitor's choice on this site, dark unless they switch, and the
  // browser chrome should match the page they are actually looking at.
  themeColor: "#0a0e14",
  colorScheme: "dark light",
};

/**
 * Applied before paint so a stored theme never flashes. Dark is the default,
 * so anything other than an explicit "light" resolves to dark.
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem("sf-theme-3");document.documentElement.dataset.theme=t==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

/**
 * Consent Mode v2, declared before GTM loads.
 *
 * Order is the entire point. `consent default` has to reach the dataLayer
 * before the container script, or tags fire once with no consent state and the
 * declaration arrives too late to matter. That is why this is a plain inline
 * script in <head> and not a next/script — those are ordered by strategy, not
 * by position.
 *
 * Everything starts denied except security_storage. If the visitor has already
 * answered, their stored answer is replayed as an `update` immediately, so a
 * returning visitor is not tracked cookielessly for the first half second of
 * every page.
 *
 * wait_for_update gives that replay a window to land before tags decide.
 */
const consentBootstrap = `(function(){
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});
try{
var m=document.cookie.match(/(?:^|; )sf_consent_1=([^;]*)/);
if(m){var s=JSON.parse(decodeURIComponent(m[1]));s.security_storage='granted';gtag('consent','update',s);}
}catch(e){}
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables must live on :root — Tailwind's @theme resolves
    // --font-display/--font-prose/--font-data there, and a var() that cannot resolve makes the
    // whole font-family declaration invalid.
    <html
      lang="en"
      data-theme="dark"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {/* Must stay above <GoogleTagManager />. See consentBootstrap. */}
        <script dangerouslySetInnerHTML={{ __html: consentBootstrap }} />
        <GoogleTagManager />
      </head>
      <body>
        <GoogleTagManagerNoScript />
        {children}
      </body>
    </html>
  );
}
