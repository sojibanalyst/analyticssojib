/**
 * Turns hand-saved portfolio screenshots into what the site serves.
 *
 *   npm run portfolio:images
 *
 * WHY THIS IS A MANUAL STEP. The screenshots live on Upwork, and Upwork
 * answers a scripted request for them with a bot wall. Getting past that would
 * mean pretending to be a browser, which this project does not do. So the
 * files are saved by hand, and everything after that is automatic.
 *
 * WHAT TO DO:
 *
 *   1. For a project, make a folder named with its Upwork id:
 *        portfolio-raw/1891949634925838336/
 *      The id is the `upwork_id` column in the portfolio_items table.
 *   2. Save that project's screenshots into it. Any names; jpg, png or webp.
 *      They are used in filename order, and the first becomes the card cover.
 *      Leave out anything that belongs to another project.
 *   3. Run this script.
 *
 * WHAT IT DOES:
 *
 *   - writes public/portfolio/<id>/<n>.webp, at most 1600px wide
 *   - skips a file whose pixels are identical to one already kept
 *   - prints the SQL that records the images on each row. Run it in the
 *     Supabase SQL editor. It only touches the `images` column.
 *
 * portfolio-raw/ is gitignored: the originals are not part of the site.
 *
 * The alt text it writes is generic ("Screenshot 2 of 5 from the project
 * ..."). These are evidence images, so a real description is better; edit the
 * `alt` values in the printed SQL before running it where you can.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(root, "portfolio-raw");
const OUT = join(root, "public", "portfolio");
const MAX_WIDTH = 1600;
const QUALITY = 78;
const TYPES = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** NAME=value lines from .env.local, without pulling in a dependency. */
function env(name) {
  if (process.env[name]) return process.env[name];
  const file = join(root, ".env.local");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

/** Titles by Upwork id, read with the public key. Published rows only. */
async function titles() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return new Map();
  const res = await fetch(`${url}/rest/v1/portfolio_items?select=upwork_id,title`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return new Map();
  return new Map((await res.json()).map((row) => [row.upwork_id, row.title]));
}

const sqlText = (value) => `'${String(value).replace(/'/g, "''")}'`;

if (!existsSync(RAW)) {
  console.log(`Nothing to do: ${RAW} does not exist. See the note at the top of this file.`);
  process.exit(0);
}

const names = await titles();
const statements = [];
let written = 0;
let duplicates = 0;

for (const id of readdirSync(RAW).sort()) {
  const dir = join(RAW, id);
  if (!statSync(dir).isDirectory() || !/^\d+$/.test(id)) continue;

  const files = readdirSync(dir)
    .filter((file) => TYPES.has(extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;

  mkdirSync(join(OUT, id), { recursive: true });
  const seen = new Set();
  const images = [];

  for (const file of files) {
    const image = sharp(join(dir, file)).rotate();
    // Compare decoded pixels, not file bytes: the same screenshot saved twice
    // rarely has the same bytes, but it does have the same picture.
    const { data, info } = await image
      .clone()
      .resize(64, 64, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const hash = createHash("sha1").update(data).update(String(info.channels)).digest("hex");
    if (seen.has(hash)) {
      duplicates++;
      continue;
    }
    seen.add(hash);

    const n = images.length + 1;
    const target = join(OUT, id, `${n}.webp`);
    const result = await image
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(target);
    images.push({ n, width: result.width, height: result.height });
    written++;
  }

  const title = names.get(id) ?? "the project";
  const json = images.map(({ n, width, height }) => ({
    src: `/portfolio/${id}/${n}.webp`,
    alt: `Screenshot ${n} of ${images.length} from the project: ${title}`,
    width,
    height,
  }));
  statements.push(
    `update public.portfolio_items set images = ${sqlText(JSON.stringify(json))}::jsonb where upwork_id = ${sqlText(id)};`,
  );
  console.log(`${id}  ${images.length} image(s)  ${names.has(id) ? title : "(no row with this id)"}`);
}

if (!statements.length) {
  console.log("No project folders with images found under portfolio-raw/.");
  process.exit(0);
}

const sqlFile = join(RAW, "images.sql");
writeFileSync(sqlFile, `${statements.join("\n")}\n`);
console.log(`\n${written} image(s) written, ${duplicates} duplicate(s) skipped.`);
console.log(`Run this in the Supabase SQL editor, then redeploy:\n  ${sqlFile}`);
