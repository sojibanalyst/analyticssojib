/**
 * Seeds the rows the console needs in order to render something other than an
 * empty state.
 *
 *   npm run seed
 *
 * Idempotent — every write is an upsert on a natural key, so running it twice
 * changes nothing. Safe to re-run after a migration.
 *
 * What it does NOT do, deliberately:
 *
 *  - It does not seed content (posts, case studies, reviews, FAQs). Those live
 *    in content/*.ts today and P2 migrates them with a before/after HTML diff.
 *    Seeding them here would create a second source of truth for pages that
 *    are already live.
 *
 *  - It does not seed event_map. This site does not fire a single event yet
 *    (lib/gtm.ts has no call sites), so any event list written now would be
 *    invented rather than observed. P3 fills it in as the collector is wired.
 *
 *  - It does not write a secret anywhere. Destinations are created disabled
 *    with empty config; ids and tokens are entered later, and access tokens
 *    never go in the database at all.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run it as: npm run seed  (which loads .env.local)",
  );
  process.exit(1);
}

// Service role: this script bypasses RLS by design. It runs from a terminal,
// never from the app, and the key is read from .env.local which is gitignored.
const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** The fan-out targets named in the brief. All start off. */
const DESTINATIONS = [
  { key: "ga4", label: "GA4 Measurement Protocol" },
  { key: "meta_capi", label: "Meta Conversions API" },
  { key: "google_ads", label: "Google Ads (enhanced conversions)" },
  { key: "tiktok_events", label: "TikTok Events API" },
  { key: "sgtm", label: "Server-side GTM" },
];

async function main() {
  const admins = await supabase
    .from("admin_emails")
    .upsert({ email: "sojibh2001@gmail.com", note: "owner" }, { onConflict: "email" });
  if (admins.error) throw admins.error;
  console.log("  ok   admin_emails");

  const destinations = await supabase
    .from("destinations")
    .upsert(
      DESTINATIONS.map((d) => ({ ...d, enabled: false, config: {} })),
      { onConflict: "key", ignoreDuplicates: true },
    );
  if (destinations.error) throw destinations.error;
  console.log(`  ok   destinations (${DESTINATIONS.length})`);

  // Values that are already public on the marketing site, copied from
  // content/site.ts. The GTM container id comes from the environment instead,
  // so a preview and production can point at different containers.
  const settings = await supabase.from("settings").upsert(
    {
      id: true,
      site_name: "analyticssojib.com",
      contact_email: "sojibh2001@gmail.com",
      calendly_url: "https://calendly.com/sojibh2001/30min",
      gtm_container_id: process.env.NEXT_PUBLIC_GTM_ID || null,
      default_currency: "USD",
    },
    { onConflict: "id" },
  );
  if (settings.error) throw settings.error;
  console.log("  ok   settings");

  console.log("\nseed complete");
}

main().catch((error) => {
  console.error("\nseed failed:", error.message ?? error);
  process.exit(1);
});
