import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { proof, site } from "@/content/site";

export const alt = `${site.name} | ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Design tokens, dark theme.
const BG = "#0A0E14";
const BORDER = "#1F2A37";
const TEXT = "#E6EDF3";
const MUTED = "#8B98A9";
const FAINT = "#8492A3";
const ACCENT = "#34E89E";
const ON_ACCENT = "#06130D";

export default async function OpengraphImage() {
  // Read from disk rather than fetch(new URL(..., import.meta.url)): Turbopack
  // has no file: fetch handler. This route is statically prerendered, so the
  // read only happens at build time.
  const font = (name: string) => readFile(join(process.cwd(), "app", name));
  const [monoBold, monoMedium, displayBold] = await Promise.all([
    font("JetBrainsMono-ExtraBold.ttf"),
    font("JetBrainsMono-Medium.ttf"),
    font("SpaceGrotesk-Bold.ttf"),
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
          fontFamily: "JetBrains Mono",
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
            SOJIB<span style={{ color: ACCENT }}>.</span>
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
              fontFamily: "Space Grotesk",
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
        { name: "JetBrains Mono", data: monoBold, weight: 800, style: "normal" },
        { name: "JetBrains Mono", data: monoMedium, weight: 500, style: "normal" },
        { name: "Space Grotesk", data: displayBold, weight: 700, style: "normal" },
      ],
    },
  );
}
