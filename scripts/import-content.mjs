/**
 * Imports content/*.ts into Supabase.
 *
 *   npm run import:content              refuses to touch tables that already have rows
 *   npm run import:content -- --force   overwrites them
 *   npm run import:content -- --sql     prints the equivalent SQL, writes nothing
 *
 * It imports the TypeScript files directly — Node 24 strips types on its own —
 * so nothing is retyped by hand between the source of truth and the database.
 * A copy-paste migration is a migration with typos in it.
 *
 * Structure: buildAll() turns the content files into plain rows, and the two
 * sinks below write them. Every decision worth getting wrong lives in
 * buildAll(), which --sql exercises without needing a service role key.
 *
 * Idempotent by key: slug for posts and case studies, source_key for reviews
 * and FAQs. Children (stats, screenshots) are replaced per parent, because
 * they have no key of their own and are meaningless apart from it.
 *
 * The --force guard exists because from P6 these rows are editable in the
 * console. Re-running this after someone has edited a post would silently
 * restore the old text; refusing unless asked twice is the difference between
 * a tool and a trap.
 */
import { posts } from "../content/posts.ts";
import { faq, reviews, work } from "../content/site.ts";

const force = process.argv.includes("--force");
const sqlOnly = process.argv.includes("--sql");

/* -------------------------------------------------------------------------- */
/* Building rows                                                              */
/* -------------------------------------------------------------------------- */

function buildPosts() {
  return posts.map((post, i) => ({
    slug: post.slug,
    topic: post.topic,
    reading_time: post.readingTime,
    title: post.title,
    summary: post.summary,
    body: post.body,
    // Every post has a live URL, finished or not — `status` is visibility,
    // `is_draft` is whether the writing is done. See migration 010003.
    status: "published",
    is_draft: post.draft,
    // Empty string is not a date. Unfinished posts have no publication date
    // yet, and "" would sort ahead of every real one.
    published_at: post.date ? post.date : null,
    sort_order: i,
  }));
}

function buildCaseStudies() {
  return work.cases.map((c, i) => ({
    parent: {
      slug: c.slug,
      code: c.code,
      status_label: c.status,
      title: c.title,
      body: c.body,
      tags: c.tags,
      intro: c.detail.intro,
      metric_caption: c.metric.caption,
      metric_before_label: c.metric.beforeLabel,
      metric_after_label: c.metric.afterLabel,
      metric_before: c.metric.before,
      metric_after: c.metric.after,
      metric_before_pct: c.metric.beforePct,
      metric_after_pct: c.metric.afterPct,
      detail_sections: c.detail.sections,
      needs_confirmation: c.needsConfirmation ?? false,
      status: "published",
      sort_order: i,
    },
    stats: c.stats.map((s, j) => ({
      value: s.value,
      unit: s.unit ?? null,
      label: s.label,
      sort_order: j,
    })),
    shots: c.screenshots.map((s, j) => ({
      // These files live in public/ and are served by Next, not by Supabase
      // Storage. Moving them would change their URLs, and no public URL may
      // change. The column holds the path exactly as the site serves it.
      storage_path: s.src,
      caption: s.caption,
      alt_text: s.alt,
      section: s.section,
      sort_order: j,
    })),
  }));
}

function buildReviews() {
  const video = reviews.items.map((item, i) => ({
    source_key: `video:${item.id}`,
    type: "video",
    youtube_id: item.id,
    youtube_url: `https://www.youtube.com/watch?v=${item.id}`,
    aspect_ratio: item.orientation,
    a11y_label: item.label,
    client_name: item.name ?? null,
    company: item.role ?? null,
    // Only ever the client's own words. Never a paraphrase.
    quote: item.quote ?? null,
    // Headline for a video whose client is not named.
    pull_quote: item.title ?? null,
    attribution: null,
    is_placeholder: false,
    source: "upwork",
    published: true,
    sort_order: i,
  }));

  const written = reviews.written.map((item, i) => ({
    source_key: `written:${i}`,
    type: "written",
    youtube_id: null,
    youtube_url: null,
    aspect_ratio: null,
    a11y_label: null,
    client_name: null,
    company: null,
    quote: item.quote,
    pull_quote: null,
    attribution: item.attribution,
    is_placeholder: item.placeholder ?? false,
    source: "upwork",
    published: true,
    sort_order: i,
  }));

  return [...video, ...written];
}

function buildFaqs() {
  return faq.items.map((item, i) => ({
    source_key: `faq:${i}`,
    question: item.q,
    answer: item.a,
    sort_order: i,
    published: true,
  }));
}

export function buildAll() {
  return {
    posts: buildPosts(),
    caseStudies: buildCaseStudies(),
    reviews: buildReviews(),
    faqs: buildFaqs(),
  };
}

/* -------------------------------------------------------------------------- */
/* SQL sink                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Columns that are jsonb rather than text[].
 *
 * Named explicitly because the JavaScript value cannot tell them apart:
 * `tags`, `body` and `detail_sections` are all arrays. Guessing from the
 * element type produced `array['{"heading":…}'::jsonb]::text[]`, which is
 * both invalid SQL and the wrong column type.
 */
const JSONB_COLUMNS = new Set(["detail_sections", "params", "config", "answers"]);

function lit(value, column) {
  if (value === null || value === undefined) return "null";
  if (JSONB_COLUMNS.has(column)) return `${lit(JSON.stringify(value))}::jsonb`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return `array[${value.map((v) => lit(v)).join(", ")}]::text[]`;
  }
  if (typeof value === "object") return `${lit(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertSql(table, rows, conflict) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const values = rows
    .map((r) => `  (${cols.map((c) => lit(r[c], c)).join(", ")})`)
    .join(",\n");
  const updates = cols
    .filter((c) => c !== conflict)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  return (
    `insert into public.${table} (${cols.join(", ")})\nvalues\n${values}\n` +
    `on conflict (${conflict}) do update set ${updates};\n`
  );
}

function toSql(data) {
  const out = [insertSql("posts", data.posts, "slug")];

  for (const { parent, stats, shots } of data.caseStudies) {
    out.push(insertSql("case_studies", [parent], "slug"));
    // Children are replaced, not merged: their order is their meaning.
    out.push(
      `delete from public.case_study_stats where case_study_id = ` +
        `(select id from public.case_studies where slug = ${lit(parent.slug)});`,
    );
    out.push(
      `delete from public.case_study_shots where case_study_id = ` +
        `(select id from public.case_studies where slug = ${lit(parent.slug)});`,
    );

    const cid = `(select id from public.case_studies where slug = ${lit(parent.slug)})`;
    out.push(
      `insert into public.case_study_stats (case_study_id, value, unit, label, sort_order)\nvalues\n` +
        stats
          .map(
            (s) =>
              `  (${cid}, ${lit(s.value)}, ${lit(s.unit)}, ${lit(s.label)}, ${s.sort_order})`,
          )
          .join(",\n") +
        ";",
    );
    out.push(
      `insert into public.case_study_shots (case_study_id, storage_path, caption, alt_text, section, sort_order)\nvalues\n` +
        shots
          .map(
            (s) =>
              `  (${cid}, ${lit(s.storage_path)}, ${lit(s.caption)}, ${lit(s.alt_text)}, ${lit(s.section)}, ${s.sort_order})`,
          )
          .join(",\n") +
        ";",
    );
  }

  out.push(insertSql("reviews", data.reviews, "source_key"));
  out.push(insertSql("faqs", data.faqs, "source_key"));
  return out.filter(Boolean).join("\n");
}

/* -------------------------------------------------------------------------- */
/* Supabase sink                                                              */
/* -------------------------------------------------------------------------- */

async function writeToSupabase(data) {
  const { createClient } = await import("@supabase/supabase-js");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Run it as: npm run import:content  (which loads .env.local), " +
        "or use --sql to print the statements instead.",
    );
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const check = ({ error }) => {
    if (error) throw new Error(error.message);
  };

  /** Refuses to clobber a table that already has data, unless --force. */
  async function guard(table) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    if (count && !force) {
      throw new Error(
        `${table} already has ${count} row(s). Re-run with --force to overwrite ` +
          "— but check nobody has edited them in the console first.",
      );
    }
  }

  await guard("posts");
  check(await supabase.from("posts").upsert(data.posts, { onConflict: "slug" }));
  console.log(`  ok   posts (${data.posts.length})`);

  await guard("case_studies");
  for (const { parent, stats, shots } of data.caseStudies) {
    const { data: row, error } = await supabase
      .from("case_studies")
      .upsert(parent, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`${parent.slug}: ${error.message}`);

    check(await supabase.from("case_study_stats").delete().eq("case_study_id", row.id));
    check(await supabase.from("case_study_shots").delete().eq("case_study_id", row.id));
    check(
      await supabase
        .from("case_study_stats")
        .insert(stats.map((s) => ({ ...s, case_study_id: row.id }))),
    );
    check(
      await supabase
        .from("case_study_shots")
        .insert(shots.map((s) => ({ ...s, case_study_id: row.id }))),
    );

    console.log(
      `  ok   case_studies/${parent.slug} (${stats.length} stats, ${shots.length} shots)`,
    );
  }

  await guard("reviews");
  check(
    await supabase.from("reviews").upsert(data.reviews, { onConflict: "source_key" }),
  );
  console.log(`  ok   reviews (${data.reviews.length})`);

  await guard("faqs");
  check(await supabase.from("faqs").upsert(data.faqs, { onConflict: "source_key" }));
  console.log(`  ok   faqs (${data.faqs.length})`);
}

/* -------------------------------------------------------------------------- */

async function main() {
  const data = buildAll();

  if (sqlOnly) {
    console.log(toSql(data));
    return;
  }

  if (force) console.log("--force: existing rows will be overwritten\n");
  await writeToSupabase(data);

  const placeholders = data.reviews.filter((r) => r.is_placeholder).length;
  console.log(
    `\nimport complete — ${placeholders} review slot(s) are still labelled placeholders`,
  );
}

main().catch((error) => {
  console.error(`\nimport failed: ${error.message}`);
  process.exit(1);
});
