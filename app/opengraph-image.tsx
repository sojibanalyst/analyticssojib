import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { proof, site, stats } from "@/content/site";

export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Design tokens, dark theme.
const BG = "#0A0A0B";
const SURFACE = "#101114";
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
  const [monoBold, monoMedium, archivoBold] = await Promise.all([
    font("JetBrainsMono-ExtraBold.woff"),
    font("JetBrainsMono-Medium.woff"),
    font("Archivo-Bold.woff"),
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
            SOJIB<span style={{ color: ACCENT }}>_</span>ANALYTICS
          </div>
          <div
            style={{
              display: "flex",
              background: ACCENT,
              color: ON_ACCENT,
              fontSize: 18,
              letterSpacing: "0.14em",
              padding: "8px 16px",
              borderRadius: 8,
            }}
          >
            ■ TRACKING INTEGRITY
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontFamily: "Archivo",
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

        {/* verified Upwork stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flex: 1,
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    fontSize: 38,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: TEXT,
                  }}
                >
                  {stat.value}
                  {stat.unit ? (
                    <span style={{ fontSize: 18, color: MUTED }}>
                      {/* Neither embedded font carries ★, and satori would try
                          to fetch a fallback at build time. Spell it instead. */}
                      {stat.unit === "★" ? "/5" : stat.unit}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "flex", fontSize: 15, letterSpacing: "0.1em", color: MUTED }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: "0.1em", color: FAINT }}>
            {site.domain.toUpperCase()} · {proof.badge} · {proof.attribution}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "JetBrains Mono", data: monoBold, weight: 800, style: "normal" },
        { name: "JetBrains Mono", data: monoMedium, weight: 500, style: "normal" },
        { name: "Archivo", data: archivoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
