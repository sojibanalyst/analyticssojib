import type { Metadata } from "next";

import { LabShell } from "@/components/lab/LabShell";
import { getLabGtm } from "@/lib/settings";

/**
 * The tracking lab: a demo store for practising ecommerce tracking.
 *
 * Outside the (marketing) group on purpose, so none of the public site's
 * chrome is here: no Tracker, no collector calls, no contact dock. The site's
 * own GTM container is skipped on /lab by components/GoogleTagManager.tsx, and
 * /api/collect drops anything that claims to come from here. Not linked from
 * the site, not in the sitemap, and noindex.
 *
 * The lab's container is set on /admin/settings (Tracking lab) and nowhere
 * else, and it is rendered here, first in the body, before any page pushes an
 * event. Read through the same cached settings call as the site's container,
 * so the lab pages stay static and a save in the console applies on the next
 * request.
 */
export const metadata: Metadata = {
  title: { default: "Demo store | Tracking lab", template: "%s | Demo store" },
  description: "A demo store for practising ecommerce tracking. Nothing is sold.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
};

export default async function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gtm = await getLabGtm();

  return (
    <>
      {gtm
        ? gtm.scripts.map((script, i) =>
            "src" in script ? (
              <script key={i} async src={script.src} />
            ) : (
              <script key={i} dangerouslySetInnerHTML={{ __html: script.inline }} />
            ),
          )
        : null}
      {gtm?.containerId ? (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm.containerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
      ) : null}
      <LabShell container={gtm ? (gtm.containerId ?? "custom snippet") : null}>{children}</LabShell>
    </>
  );
}
