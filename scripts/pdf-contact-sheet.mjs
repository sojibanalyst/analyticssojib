/**
 * Render every page of a PDF into one grid image, so a long document can be
 * scanned for usable screenshots in a single look instead of page by page.
 *
 *   node scripts/pdf-contact-sheet.mjs <pdf> <out.png> [cols]
 *
 * Dev-only helper. Page numbers are burned in via ordering: read left to
 * right, top to bottom.
 */
import { pdf } from "pdf-to-img";
import sharp from "sharp";

const [, , src, out, colsArg] = process.argv;
const COLS = Number(colsArg || 6);
const CELL_W = 300;

const doc = await pdf(src, { scale: 1 });
const thumbs = [];
for await (const page of doc) {
  thumbs.push(await sharp(page).resize({ width: CELL_W }).toBuffer());
}

const meta = await sharp(thumbs[0]).metadata();
const CELL_H = meta.height;
const rows = Math.ceil(thumbs.length / COLS);

await sharp({
  create: {
    width: COLS * CELL_W,
    height: rows * CELL_H,
    channels: 3,
    background: { r: 210, g: 210, b: 210 },
  },
})
  .composite(
    thumbs.map((input, i) => ({
      input,
      left: (i % COLS) * CELL_W,
      top: Math.floor(i / COLS) * CELL_H,
    })),
  )
  .png()
  .toFile(out);

console.log(`${out}  ${COLS * CELL_W}x${rows * CELL_H}  ${thumbs.length} pages, ${COLS} per row`);
