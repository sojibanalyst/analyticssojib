/**
 * Re-normalises an existing snapshot's raw HTML with the current rules.
 *
 *   node scripts/renormalise.mjs .snapshots/p4
 *
 * Needed whenever snapshot-pages.mjs learns to ignore a new kind of
 * build-to-build noise: without it, an old snapshot would still be compared
 * under the old rules and report a difference the new rules exist to dismiss.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalise } from "./snapshot-pages.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/renormalise.mjs <snapshotDir>");
  process.exit(1);
}

const files = (await readdir(dir)).filter(
  (name) => name.endsWith(".html") && !name.endsWith(".norm.html"),
);

for (const name of files) {
  const raw = await readFile(path.join(dir, name), "utf8");
  const out = name.replace(/\.html$/, ".norm.html");
  await writeFile(path.join(dir, out), normalise(raw), "utf8");
  console.log(`  ok   ${out}`);
}

console.log(`\nre-normalised ${files.length} file(s) in ${dir}`);
