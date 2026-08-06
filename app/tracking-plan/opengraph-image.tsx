import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { trackingPlanMeta, planSections } from "@/content/tracking-plan";

export const alt = trackingPlanMeta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0A0A0B";
const SURFACE = "#101114";
const BORDER = "#24252A";
const TEXT = "#FAFAFA";
const MUTED = "#A7AAB2";
const FAINT = "#8C8F97";
const ACCENT = "#FF4A3D";
const ON_ACCENT = "#170603";

export default async function OpengraphImage() {
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
            {trackingPlanMeta.eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: TEXT,
            }}
          >
            {trackingPlanMeta.ogTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: MUTED,
              maxWidth: 940,
            }}
          >
            {trackingPlanMeta.stack}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {planSections.slice(0, 6).map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 16,
                  letterSpacing: "0.08em",
                  color: MUTED,
                }}
              >
                {s.num} / {s.kicker}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: "0.1em", color: FAINT }}>
            {site.domain.toUpperCase()}/TRACKING-PLAN
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
