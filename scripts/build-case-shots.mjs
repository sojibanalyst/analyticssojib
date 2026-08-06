/**
 * Build every case-card screenshot in one pass, from the client PDFs.
 *
 *   node scripts/build-case-shots.mjs
 *
 * Each entry names the page and the crop that removes the identifying strip.
 * Crops are not guesses — run scripts/pdf-page.mjs to dump a page full size,
 * find the coordinates, then record them here so the set is reproducible.
 *
 * After running, ALWAYS build a contact sheet of public/case-*.png and look at
 * it. A crop that is safe on one page can leave an account name, a store URL,
 * a product name or a customer id visible on another.
 *
 * Dev-only.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const AUDIT = "E:\\Portfolio PDF\\Shopify Tracking Audit and Setup for rfb.woven.art.pdf";
const ADS = "E:\\Portfolio PDF\\Shopify Google ads & Google Analytics setup.pdf";

// GA4 DebugView pages put the account name in the top bar only; everything
// below y=300 is the event stream and the event counts.
const GA4_CROP = "20,300,1400,412";

const shots = [
  // --- CASE_007 : purchase accuracy -------------------------------------
  { out: "case-shopify-accuracy.png", pdf: ADS, page: 2, crop: "145,198,940,310" },
  { out: "case-ga4-checkout.png", pdf: AUDIT, page: 23, crop: GA4_CROP },
  { out: "case-ga4-shipping.png", pdf: AUDIT, page: 21, crop: GA4_CROP },
  // Page 22 (add_payment_info) is deliberately absent: it renders a customer
  // user_id in the event stream, above the highlighted event, so the standard
  // crop cannot remove it without losing the subject. add_payment_info is
  // already visible in case-shopify-accuracy.png.

  // --- CASE_011 : Meta deduplication ------------------------------------
  // Only the collapsed Events Received table. The expanded rows on the
  // neighbouring pages print the store URL, so they are deliberately unused.
  { out: "case-meta-roas.png", pdf: AUDIT, page: 13, crop: "180,212,1240,212" },
  { out: "case-meta-tags.png", pdf: AUDIT, page: 6, crop: "20,300,1400,412" },
  { out: "case-ga4-viewitem.png", pdf: AUDIT, page: 16, crop: GA4_CROP },
];

const script = path.join("scripts", "pdf-case-screenshot.mjs");

for (const s of shots) {
  const out = path.join("public", s.out);
  execFileSync(
    process.execPath,
    [script, s.pdf, String(s.page), out, s.crop],
    { stdio: "inherit" },
  );
}
