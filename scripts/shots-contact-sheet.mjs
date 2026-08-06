/**
 * Grid every public/case-*.png into one image so the whole set can be checked
 * for client identifiers in a single look before it ships.
 *
 *   node scripts/shots-contact-sheet.mjs <out.png>
 *
 * Dev-only.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const out = process.argv[2] || "shots-sheet.png";
const dir = "public";
const files = (await fs.readdir(dir))
  .filter((f) => f.startsWith("case-") && f.endsWith(".png"))
  .sort();

const COLS = 2;
const CELL_W = 900;
const thumbs = [];
for (const f of files) {
  thumbs.push({
    name: f,
    buf: await sharp(path.join(dir, f)).resize({ width: CELL_W }).toBuffer(),
  });
}

const meta = await sharp(thumbs[0].buf).metadata();
const CELL_H = meta.height;
const rows = Math.ceil(thumbs.length / COLS);

await sharp({
  create: {
    width: COLS * CELL_W,
    height: rows * CELL_H,
    channels: 3,
    background: { r: 40, g: 40, b: 44 },
  },
})
  .composite(
    thumbs.map((t, i) => ({
      input: t.buf,
      left: (i % COLS) * CELL_W,
      top: Math.floor(i / COLS) * CELL_H,
    })),
  )
  .png()
  .toFile(out);

console.log(out, `${COLS * CELL_W}x${rows * CELL_H}`);
files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
