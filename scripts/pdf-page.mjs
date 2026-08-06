/**
 * Dump one PDF page to PNG at full render scale, uncropped and unframed.
 * Use this to find crop coordinates before running pdf-case-screenshot.mjs.
 *
 *   node scripts/pdf-page.mjs <pdf> <page> <out.png>
 *
 * Dev-only helper.
 */
import { pdf } from "pdf-to-img";
import sharp from "sharp";
import fs from "node:fs/promises";

const [, , src, pageArg, out] = process.argv;
const wanted = Number(pageArg);

const doc = await pdf(src, { scale: 2 });
let i = 0;
for await (const page of doc) {
  if (++i === wanted) {
    await fs.writeFile(out, page);
    const m = await sharp(page).metadata();
    console.log(`${out}  ${m.width}x${m.height}`);
    process.exit(0);
  }
}
console.error(`page ${wanted} not found (document has ${doc.length})`);
process.exit(1);
