/**
 * Fails the build if a server-only secret reached the client bundle.
 *
 *   node scripts/check-no-secrets.mjs
 *
 * Run it AFTER `next build`. It scans .next/static — everything in there is
 * served to browsers — for three things:
 *
 *  1. The literal value of SUPABASE_SERVICE_ROLE_KEY, when it is set in this
 *     environment. This is the check the brief asks for by name.
 *
 *  2. A key in the current secret format (sb_secret_…), so the check still
 *     bites in CI, where the real key is usually not available. A check that
 *     can only pass vacuously is not a check.
 *
 *  3. A JWT whose payload decodes to "role":"service_role" — the legacy key
 *     format. Matched by decoding rather than by shape, because the legacy
 *     ANON key is also a JWT and is meant to be public: a shape-only rule
 *     would fail every build that used one.
 *
 * .next/server is deliberately not scanned. lib/supabase/admin.ts refers to
 * the variable by name there and is supposed to — that code never ships.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = ".next/static";
const TEXT = /\.(js|mjs|cjs|json|css|map|txt|html)$/;

const literal = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** Substring and regex rules. Each reports the file it matched in. */
const RULES = [
  { name: "Supabase secret key (sb_secret_…)", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "SUPABASE_SERVICE_ROLE_KEY referenced by name", re: /SUPABASE_SERVICE_ROLE_KEY/ },
];

if (literal && literal.length >= 12) {
  RULES.push({ name: "the configured service role key, verbatim", literal });
}

const JWT = /eyJ[A-Za-z0-9_-]{6,}\.([A-Za-z0-9_-]{6,})\.[A-Za-z0-9_-]{6,}/g;

/** True when a JWT-shaped string in `contents` claims the service_role role. */
function hasServiceRoleJwt(contents) {
  for (const match of contents.matchAll(JWT)) {
    try {
      const payload = Buffer.from(match[1], "base64url").toString("utf8");
      if (JSON.parse(payload).role === "service_role") return true;
    } catch {
      // Not a JWT after all, just something that looked like one.
    }
  }
  return false;
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (TEXT.test(entry.name)) yield full;
  }
}

try {
  await stat(ROOT);
} catch {
  console.error(`FAIL  ${ROOT} does not exist — run \`next build\` first`);
  process.exit(1);
}

let scanned = 0;
const hits = [];

for await (const file of walk(ROOT)) {
  const contents = await readFile(file, "utf8");
  scanned++;

  for (const rule of RULES) {
    const found = rule.literal
      ? contents.includes(rule.literal)
      : rule.re.test(contents);
    if (found) hits.push({ file, name: rule.name });
  }

  if (hasServiceRoleJwt(contents)) {
    hits.push({ file, name: "legacy service_role JWT" });
  }
}

console.log(`scanned ${scanned} file(s) under ${ROOT}`);

if (!scanned) {
  console.error("FAIL  nothing was scanned — the build produced no static assets");
  process.exit(1);
}

if (hits.length) {
  for (const hit of hits) console.error(`FAIL  ${hit.file} — ${hit.name}`);
  console.error(
    `\n${hits.length} secret leak(s) in the client bundle. A server-only value ` +
      "has been imported into a component that ships to the browser.",
  );
  process.exit(1);
}

console.log("no secrets in the client bundle");
