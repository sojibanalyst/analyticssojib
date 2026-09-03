import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { proof, site } from "@/content/site";

export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Design tokens, dark theme.
const BG = "#0A0A0B";
const BORDER = "#24252A";
const TEXT = "#FAFAFA";
const MUTED = "#A7AAB2";
const FAINT = "#8C8F97";
const ACCENT = "#35C97B";
const ON_ACCENT = "#000000";

export default async function OpengraphImage() {
  // Read from disk rather than fetch(new URL(..., import.meta.url)): Turbopack
  // has no file: fetch handler. This route is statically prerendered, so the
  // read only happens at build time.
  const font = (name: string) => readFile(join(process.cwd(), "app", name));
  const [monoBold, monoMedium, geistBold] = await Promise.all([
    font("GeistMono-ExtraBold.ttf"),
    font("GeistMono-Medium.ttf"),
    font("Geist-Bold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "64px 72px",
          fontFamily: "Geist Mono",
        }}
      >
        {/* wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: TEXT,
          }}
        >
          <div style={{ display: "flex" }}>
            SOJIB<span style={{ color: ACCENT }}>_</span>ANALYTICS
          </div>
          {/* The square is DRAWN, not typed. As a "■" character it rendered as
              a tofu box on the share card: Satori fetches a font per glyph and
              the request for that one returns 400, which is the "Failed to
              load dynamic font for ■" line in the build output. Nobody sees a
              build warning; everybody who shares the link sees the box. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: ACCENT,
              color: ON_ACCENT,
              fontSize: 18,
              letterSpacing: "0.14em",
              padding: "8px 16px",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", width: 10, height: 10, background: ON_ACCENT }} />
            TRACKING INTEGRITY
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontFamily: "Geist",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: TEXT,
              maxWidth: 1000,
            }}
          >
            If the data is&nbsp;<span style={{ color: ACCENT }}>wrong,</span>
            &nbsp;every decision after it&nbsp;
            <span style={{ color: ACCENT }}>is a guess.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: MUTED,
              maxWidth: 900,
            }}
          >
            GA4 · Google Tag Manager · Server-side tagging · Meta CAPI ·
            Enhanced conversions
          </div>
        </div>

        {/* The proof line, matching the page: two figures that are true off
            Upwork as well as on it, and one verification note. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: TEXT,
            }}
          >
            <span style={{ color: ACCENT }}>{proof.rating}/5</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: MUTED }}>
              from {proof.reviews} reviews
            </span>
            <span style={{ fontSize: 22, color: BORDER }}>|</span>
            <span>{proof.projects}</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: MUTED }}>
              projects delivered
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: "0.1em", color: FAINT }}>
            {site.domain.toUpperCase()} · {proof.badge} · {proof.verifyLabel}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist Mono", data: monoBold, weight: 800, style: "normal" },
        { name: "Geist Mono", data: monoMedium, weight: 500, style: "normal" },
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
      ],
    },
  );
}
