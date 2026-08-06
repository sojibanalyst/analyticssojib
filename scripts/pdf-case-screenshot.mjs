/**
 * Turn a page of a client PDF into a case-card screenshot.
 *
 *   node scripts/pdf-case-screenshot.mjs <pdf> <page> <out.png> [l,t,w,h]
 *
 * Two things this exists to enforce:
 *
 * 1. The case cards are anonymous. Client PDFs are not — the GA4 account name
 *    sits in the top bar of every screenshot, and store names appear in
 *    Shopify admin chrome. The crop box is mandatory so the identifying strip
 *    is removed rather than published. ALWAYS open the output and check it
 *    before committing; a crop that looks right on one page can leave a store
 *    name visible on another.
 *
 * 2. The slot is 16:7. Output is framed onto a fixed 1600x700 tile on a
 *    neutral light canvas so screenshots of different shapes still sit
 *    consistently in the card, and so a light UI screenshot reads the same in
 *    both site themes.
 *
 * Dev-only: pdf-to-img and sharp never reach the browser bundle.
 */
import { pdf } from "pdf-to-img";
import sharp from "sharp";
import path from "node:path";

const [, , src, pageArg, out, cropArg] = process.argv;

if (!src || !pageArg || !out) {
  console.error("usage: node scripts/pdf-case-screenshot.mjs <pdf> <page> <out.png> [left,top,width,height]");
  process.exit(1);
}

const W = 1600;
const H = 700;
const PAD = 28;
const CANVAS = { r: 244, g: 244, b: 242 };

const wanted = Number(pageArg);
const doc = await pdf(src, { scale: 2 });

let pageBuf = null;
let i = 0;
for await (const page of doc) {
  if (++i === wanted) {
    pageBuf = page;
    break;
  }
}
if (!pageBuf) {
  console.error(`page ${wanted} not found (document has ${doc.length})`);
  process.exit(1);
}

let img = sharp(pageBuf);
if (cropArg) {
  const [left, top, width, height] = cropArg.split(",").map(Number);
  img = img.extract({ left, top, width, height });
}

const inner = await img
  .resize(W - PAD * 2, H - PAD * 2, { fit: "inside" })
  .toBuffer();
const meta = await sharp(inner).metadata();

await sharp({ create: { width: W, height: H, channels: 3, background: CANVAS } })
  .composite([
    {
      input: inner,
      left: Math.round((W - meta.width) / 2),
      top: Math.round((H - meta.height) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`${path.basename(out)}  ${W}x${H}  (inner ${meta.width}x${meta.height})`);
console.log("Open it and confirm no account name, store name or domain is visible.");
