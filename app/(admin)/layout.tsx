import type { Metadata } from "next";

/**
 * Wrapper for everything under /admin.
 *
 * It cannot render <html> or <body> — the root layout owns those, and owns the
 * fonts and the theme bootstrap with them. All this adds is the `.admin` scope
 * that switches the console to 13px density, and a hard noindex.
 *
 * No Header, no Footer, no GTM beyond what the root already emits: the console
 * must not appear in the analytics it exists to inspect.
 */
export const metadata: Metadata = {
  // The console's own title, and its own template for the screens under it:
  // "Reviews | Console | Sojib H.". Without this they took the public site's.
  title: { default: "Console | Sojib H.", template: "%s | Console | Sojib H." },
  description: null,
  robots: { index: false, follow: false, nocache: true },
  // A private tool has no share card and is nobody's canonical page. Null
  // rather than omitted: omitted would inherit the public site's.
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin">{children}</div>;
}
