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
 *  - It seeds event_map with exactly the events the code fires, and nothing
 *    else. Every entry below has a call site in this repo; the moment one
 *    does not, the Event map screen will show it as documented-but-never-seen,
 *    which is worse than not documenting it.
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

/**
 * The tracking plan, as code. Each of these has a real call site:
 *   page_view        components/Tracker.tsx
 *   book_call_click  components/CalendlyPopupButton.tsx
 *   consent_update   lib/consent.ts
 *
 * `dedup_key` is event_id everywhere, because that is the whole mechanism:
 * one id generated in the browser, reused by the server, so the two paths
 * resolve to one conversion instead of two.
 */
const EVENT_MAP = [
  {
    event_name: "page_view",
    trigger_description: "A public page is rendered, and on soft navigation between them.",
    parameters: { page_path: "string" },
    destinations: ["ga4"],
    dedup_key: "event_id",
    status: "live",
  },
  {
    event_name: "book_call_click",
    trigger_description:
      "Any Calendly button is clicked, including modified clicks that open a new tab.",
    parameters: { placement: "hero | header | contact" },
    destinations: ["ga4", "meta_capi", "google_ads"],
    dedup_key: "event_id",
    status: "live",
  },
  {
    event_name: "generate_lead",
    trigger_description:
      "The enquiry form is submitted AND the server confirms the row. Never on click.",
    parameters: { form: "contact" },
    destinations: ["ga4", "meta_capi", "google_ads"],
    dedup_key: "event_id",
    status: "live",
  },
  {
    event_name: "consent_update",
    // Documented and dormant, on purpose. setConsent() in lib/consent.ts still
    // pushes it; nothing calls setConsent() while the site has no consent
    // interface, so this fires zero times and the event map says "Documented"
    // rather than "Receiving". Deleting it would throw away the contract a CMP
    // has to satisfy — which is the one thing worth keeping here.
    trigger_description:
      "A consent management platform records a choice, via setConsent(). Nothing " +
      "fires this today: the site has no consent interface.",
    parameters: { consent_state: "object" },
    destinations: [],
    dedup_key: "event_id",
    status: "live",
  },
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

  const eventMap = await supabase
    .from("event_map")
    .upsert(EVENT_MAP, { onConflict: "event_name" });
  if (eventMap.error) throw eventMap.error;
  console.log(`  ok   event_map (${EVENT_MAP.length})`);

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
