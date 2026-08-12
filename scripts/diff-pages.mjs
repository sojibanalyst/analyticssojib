/**
 * Diffs two snapshot directories written by snapshot-pages.mjs.
 *
 *   node scripts/diff-pages.mjs .snapshots/before .snapshots/after
 *
 * Compares the .norm.html files only. Exits non-zero if any page differs, and
 * prints the first differing region with context so the change can be read
 * rather than guessed at.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const [beforeDir, afterDir] = process.argv.slice(2);

if (!beforeDir || !afterDir) {
  console.error("usage: node scripts/diff-pages.mjs <beforeDir> <afterDir>");
  process.exit(1);
}

const CONTEXT = 90;

/** Index of the first differing character, or -1. */
function firstDifference(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : len;
}

const names = (await readdir(beforeDir))
  .filter((f) => f.endsWith(".norm.html"))
  .sort();

let changed = 0;

for (const name of names) {
  const route = name.replace(/\.norm\.html$/, "");
  let before, after;

  try {
    before = await readFile(path.join(beforeDir, name), "utf8");
    after = await readFile(path.join(afterDir, name), "utf8");
  } catch (err) {
    console.log(`MISSING  ${route} — ${err.message}`);
    changed++;
    continue;
  }

  const at = firstDifference(before, after);

  if (at === -1) {
    console.log(`  same  ${String(before.length).padStart(7)} chars  ${route}`);
    continue;
  }

  changed++;
  console.log(`\nDIFF  ${route}`);
  console.log(`  ${before.length} chars before, ${after.length} after`);
  console.log(`  first difference at character ${at}:`);
  console.log(`  before: …${before.slice(Math.max(0, at - CONTEXT), at + CONTEXT)}…`);
  console.log(`  after:  …${after.slice(Math.max(0, at - CONTEXT), at + CONTEXT)}…\n`);
}

console.log(
  changed
    ? `\n${changed} page(s) changed`
    : `\nall ${names.length} pages identical`,
);
process.exit(changed ? 1 : 0);
