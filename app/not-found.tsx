import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: "20px",
        paddingBlock: "64px",
        paddingInline: "max(clamp(18px, 4vw, 48px), calc((100% - 1280px) / 2))",
      }}
    >
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1
        style={{
          margin: 0,
          maxWidth: "20ch",
          fontFamily: "var(--font-sans)",
          fontSize: "clamp(28px, 5.2vw, 46px)",
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          textTransform: "uppercase",
          textWrap: "balance",
        }}
      >
        That page isn’t here.
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: "52ch",
          fontSize: "16px",
          lineHeight: 1.65,
          color: "var(--muted)",
        }}
      >
        The link may be out of date. Everything on {site.domain} lives on the one
        page.
      </p>
      <Link href="/" className="btn btn-primary">
        BACK TO THE HOMEPAGE →
      </Link>
    </main>
  );
}
