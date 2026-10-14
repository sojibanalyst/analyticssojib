import type { Metadata } from "next";

import { LabShell } from "@/components/lab/LabShell";

/**
 * The tracking lab: a demo store for practising ecommerce tracking.
 *
 * Outside the (marketing) group on purpose, so none of the public site's
 * chrome is here: no Tracker, no collector calls, no contact dock. The site's
 * own GTM container is skipped on /lab by components/GoogleTagManager.tsx, and
 * /api/collect drops anything that claims to come from here. Not linked from
 * the site, not in the sitemap, and noindex.
 */
export const metadata: Metadata = {
  title: { default: "Demo store | Tracking lab", template: "%s | Demo store" },
  description: "A demo store for practising ecommerce tracking. Nothing is sold.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
};

export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LabShell>{children}</LabShell>;
}
