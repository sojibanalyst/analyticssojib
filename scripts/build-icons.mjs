/**
 * Build the favicon set from one vector mark.
 *
 *   node scripts/build-icons.mjs
 *
 * The mark is three ascending signal bars on a dark tile. The tile stays dark
 * in both site themes: a favicon sits on browser chrome, not on the page, and
 * a dark tile reads on both light and dark tab bars.
 *
 * Colours come from the design tokens — keep ACCENT in step with --accent.
 *
 * Dev-only.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BG = "#0A0A0B";
const ACCENT = "#35C97B";
const FAINT = "#8C8F97";

function mark(size, radiusRatio = 0.22, pad = 0.18) {
  const r = size * radiusRatio;
  const p = size * pad;
  const inner = size - p * 2;
  const barW = inner * 0.2;
  const gap = (inner - barW * 3) / 2;
  const bars = [0.42, 0.68, 1.0]
    .map((h, i) => {
      const bh = inner * h;
      const x = p + i * (barW + gap);
      const y = p + inner - bh;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="${(barW * 0.25).toFixed(2)}" fill="${i === 0 ? FAINT : ACCENT}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r.toFixed(2)}" fill="${BG}"/>
  ${bars}
</svg>`;
}

fs.writeFileSync(path.join("app", "icon.svg"), mark(64), "utf8");
console.log("app/icon.svg");

const targets = [
  { file: path.join("app", "apple-icon.png"), size: 180, pad: 0.16 },
  { file: path.join("public", "icon-192.png"), size: 192 },
  { file: path.join("public", "icon-512.png"), size: 512 },
  { file: path.join("public", "icon-32.png"), size: 32, pad: 0.14 },
];

for (const t of targets) {
  await sharp(Buffer.from(mark(t.size, 0.22, t.pad ?? 0.18)))
    .png()
    .toFile(t.file);
  console.log(t.file, `${t.size}px`);
}

// favicon.ico: a real single-image ICO container around the 32px PNG.
const png32 = await sharp(Buffer.from(mark(32, 0.22, 0.14))).png().toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(22, 12);
fs.writeFileSync(path.join("public", "favicon.ico"), Buffer.concat([header, entry, png32]));
console.log("public/favicon.ico");
