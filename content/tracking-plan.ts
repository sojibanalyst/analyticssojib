/**
 * /tracking-plan — a public, generic sample of the tracking plan written at the
 * start of every engagement.
 *
 * HARD RULE: nothing on this page is a result. Every figure is a target, a
 * tolerance or a rule. No content here is tied to CASE_007 or CASE_011, and the
 * case-study metrics (98%, 7.2/10, 9.3/10, 100%, £31k, 14 days) must never
 * appear here in any framing.
 */

export type Block =
  | { kind: "para"; text: string }
  | { kind: "lead"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "rules"; items: { term: string; text: string }[] }
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "code"; label: string; lang: "js" | "text"; code: string }
  | { kind: "subhead"; text: string }
  | { kind: "note"; text: string }
  | { kind: "cta" };

export type PlanSection = {
  /** anchor id + sub-nav target */
  id: string;
  /** "01" */
  num: string;
  /** "SCOPE" */
  kicker: string;
  /** "WHAT THIS DOCUMENT DOES" */
  title: string;
  blocks: Block[];
};

export const trackingPlanMeta = {
  eyebrow: "SAMPLE DELIVERABLE",
  h1: "The plan comes before the tag.",
  standfirst: [
    "Most broken analytics setups aren’t broken because someone wrote a bad tag. They’re broken because nobody wrote down what was supposed to be measured — so three people implemented three different versions of `purchase` over two years, and now nobody can say which number is real.",
    "This is the document I write before I touch anything. It’s generic — no client, no real figures — but the structure, the naming rules and the QA criteria are exactly what I use. If you’ve never been handed one of these, this is what you should be asking for.",
  ],
  stack: "GA4 · GTM · SERVER-SIDE GTM · META CAPI · GOOGLE ADS EC · CONSENT MODE V2",
  downloadLabel: "DOWNLOAD AS PDF →",
  contentsLabel: "CONTENTS",
  title: "Tracking Plan Template — GA4, GTM, Server-Side & Meta CAPI | Sojib H.",
  description:
    "The measurement and tracking plan I write before implementing anything: dataLayer spec, GA4 configuration, server-side architecture, Consent Mode v2 and the QA checklist I sign off against.",
  ogTitle: "TRACKING PLAN",
  closing: {
    heading: "This is week one.",
    body: "Every engagement starts with a version of this document, written for your stack and your questions rather than a generic one. If your current setup doesn’t have one, that’s usually the reason nobody trusts the numbers.",
    ctaNote:
      "This is what you get in week one. If your setup needs it, the call is free.",
    secondary: "SEE THE CASE FILES →",
    secondaryHref: "/#work",
  },
} as const;

export const planSections: PlanSection[] = [
  {
    id: "scope",
    num: "01",
    kicker: "SCOPE",
    title: "What this document does",
    blocks: [
      {
        kind: "lead",
        text: "Every tag, trigger, variable and destination that gets built maps back to a row in this plan. If it isn’t in here, it doesn’t get implemented. If it is, it gets QA’d against section 10 before handover.",
      },
      { kind: "para", text: "Four people use it, for four different reasons:" },
      {
        kind: "table",
        head: ["Who", "What they use it for"],
        rows: [
          ["Marketing", "Confirms the questions in section 02 are the ones they actually need answered."],
          ["Developers", "Implements the dataLayer contract in section 05, exactly as written. That’s the only section they need."],
          ["Me", "Builds the web and server containers, GA4 configuration and destination mapping from sections 06–09."],
          ["Sign-off", "Runs the checklist in section 10. Nothing ships until every row passes."],
        ],
      },
    ],
  },
  {
    id: "questions",
    num: "02",
    kicker: "QUESTIONS",
    title: "Tracking exists to answer something",
    blocks: [
      {
        kind: "lead",
        text: "Every event traces back to at least one business question. Anything that answers no question gets left out — which is most of what comes bundled in a template.",
      },
      {
        kind: "table",
        head: ["#", "Question", "Metric", "Events"],
        rows: [
          ["Q1", "Which channels actually produce revenue, not just sessions?", "Revenue and ROAS by session source / medium", "`purchase`"],
          ["Q2", "Where do people drop out of checkout?", "Step-to-step conversion rate", "`view_cart` → `begin_checkout` → `add_shipping_info` → `add_payment_info` → `purchase`"],
          ["Q3", "Which products get viewed but never added?", "View-to-add rate by item", "`view_item`, `add_to_cart`"],
          ["Q4", "Is one ad platform being credited fairly against another?", "Platform-reported vs GA4 vs backend orders", "`purchase`, all destinations"],
          ["Q5", "Does on-site search find anything useful?", "Search → view → purchase rate", "`search`, `view_item`, `purchase`"],
          ["Q6", "What’s a returning customer worth versus a first-time buyer?", "Revenue per user by customer type", "`purchase` + user properties"],
        ],
      },
      {
        kind: "note",
        text: "**Deliberately out of scope:** scroll depth, time-on-page engagement scoring, and any event that exists only because a template included it. They answer none of the above, and they burn through GA4’s 500-distinct-event limit on noise.",
      },
      { kind: "cta" },
    ],
  },
  {
    id: "architecture",
    num: "03",
    kicker: "ARCHITECTURE",
    title: "Two containers, one event ID",
    blocks: [
      {
        kind: "lead",
        text: "Browser-side handles collection and consent. The server container handles distribution. This is what makes the deduplication in section 08 possible.",
      },
      {
        kind: "code",
        label: "EVENT FLOW",
        lang: "text",
        code: `Website
   |
   +-- window.dataLayer.push({ ... })          <- the section 05 contract
           |
           v
   [ GTM WEB CONTAINER ]
           |  consent state (Consent Mode v2)
           |  generates event_id — shared downstream
           |
           v   first-party HTTPS  ->  sgtm.yourdomain.com
   [ GTM SERVER CONTAINER ]
           |
           +--> GA4
           +--> Meta Conversions API     (event_id dedup with the browser pixel)
           +--> Google Ads               (enhanced conversions for web)
           +--> BigQuery                 (raw event archive)`,
      },
      { kind: "subhead", text: "Why server-side, in four lines" },
      {
        kind: "rules",
        items: [
          {
            term: "First-party cookie set by the server.",
            text: "Safari’s ITP caps JavaScript-set cookies at seven days. A server-set cookie on your own subdomain survives far longer, so returning-visitor attribution stops collapsing into “direct”.",
          },
          {
            term: "Ad-blocker resilience.",
            text: "Requests go to a subdomain of your own site, not to a domain on a public blocklist.",
          },
          {
            term: "One place to control what leaves the site.",
            text: "PII redaction, parameter allow-listing and consent enforcement happen server-side, where marketing can’t accidentally undo them.",
          },
          {
            term: "Deduplication.",
            text: "The browser pixel and the server event carry the same `event_id`, so the platform counts one conversion instead of two.",
          },
        ],
      },
      {
        kind: "note",
        text: "**Environments:** staging and production run separate containers, separate server endpoints and separate GA4 properties. Nothing is tested in the property the board reads.",
      },
    ],
  },
  {
    id: "conventions",
    num: "04",
    kicker: "CONVENTIONS",
    title: "Rules, not preferences",
    blocks: [
      {
        kind: "lead",
        text: "Half the value of a tracking plan is that the next person can guess the name of something correctly.",
      },
      {
        kind: "table",
        head: ["Object", "Convention", "Example"],
        rows: [
          ["Event", "`snake_case`, GA4 recommended name where one exists", "`add_to_cart`, `generate_lead`"],
          ["Parameter", "`snake_case`, no vendor prefixes", "`item_list_name`, `shipping_tier`"],
          ["GTM tag", "`Platform - Type - Detail`", "`GA4 - Event - purchase`"],
          ["GTM trigger", "`CE - <event_name>`", "`CE - add_to_cart`"],
          ["GTM variable", "`DLV - <path>` / `CJS - <purpose>`", "`DLV - ecommerce.value`"],
          ["Server client", "`Client - <source>`", "`Client - GA4`"],
        ],
      },
      { kind: "subhead", text: "Non-negotiable" },
      {
        kind: "rules",
        items: [
          {
            term: "No PII in GA4. Ever.",
            text: "No email, phone, name or full address in any parameter or in the page path. Emails are SHA-256 hashed before they reach Meta or Google Ads, and never reach GA4 at all.",
          },
          {
            term: "No custom event where a GA4 recommended event exists.",
            text: "Recommended events unlock built-in reports. Custom names don’t.",
          },
          {
            term: "`currency` is always a three-letter ISO code. `value` is always a number",
            text: "— never a string, never with a symbol.",
          },
          {
            term: "Every new event needs a row in this document before it gets built.",
            text: "The document is the record, not the container.",
          },
          {
            term: "No tag is published without a preview-mode screenshot",
            text: "attached to the change ticket.",
          },
        ],
      },
    ],
  },
  {
    id: "datalayer",
    num: "05",
    kicker: "DATALAYER",
    title: "The developer contract",
    blocks: [
      {
        kind: "lead",
        text: "Everything downstream depends on these pushes landing with these exact key names.",
      },
      {
        kind: "list",
        items: [
          "Declare `window.dataLayer = window.dataLayer || [];` before the GTM snippet, in the `<head>`.",
          "Clear the previous ecommerce object before every ecommerce push: `window.dataLayer.push({ ecommerce: null });`. Without this, item arrays bleed between events.",
          "Push on the actual user action, not on page load.",
          "`value` equals the sum of `price × quantity` for the items in that event, excluding shipping and tax unless stated.",
          "Fire `user_data` as soon as identity is known, before the conversion event that depends on it.",
        ],
      },
      { kind: "subhead", text: "Event inventory" },
      {
        kind: "table",
        head: ["Event", "Fires when", "Key parameters", "Answers"],
        rows: [
          ["`view_item_list`", "Collection or search results render", "`items[]`, `item_list_id`, `item_list_name`", "Q3, Q5"],
          ["`select_item`", "Product card clicked", "`items[]`, `item_list_name`", "Q3"],
          ["`view_item`", "Product detail page renders", "`items[]`, `value`, `currency`", "Q3"],
          ["`add_to_cart`", "Add confirmed by the backend", "`items[]`, `value`, `currency`", "Q2, Q3"],
          ["`remove_from_cart`", "Item removed", "`items[]`, `value`, `currency`", "Q2"],
          ["`view_cart`", "Cart drawer or `/cart` opened", "`items[]`, `value`, `currency`", "Q2"],
          ["`begin_checkout`", "Checkout initiated", "`items[]`, `value`, `currency`, `coupon`", "Q2"],
          ["`add_shipping_info`", "Shipping method selected", "`items[]`, `value`, `shipping_tier`", "Q2"],
          ["`add_payment_info`", "Payment method selected", "`items[]`, `value`, `payment_type`", "Q2"],
          ["`purchase`", "Order confirmation", "`transaction_id`, `value`, `tax`, `shipping`, `currency`, `coupon`, `items[]`", "Q1, Q2, Q4, Q6"],
          ["`refund`", "Refund webhook, server-side only", "`transaction_id`, `value`, `currency`", "Q1"],
          ["`search`", "On-site search submitted", "`search_term`, `results_count`", "Q5"],
          ["`generate_lead`", "Form success", "`form_id`, `form_name`, `lead_type`", "Q6"],
          ["`login` / `sign_up`", "Auth success", "`method`", "Q6"],
          ["`user_data`", "Identity becomes known", "`user_id`, hashed identifiers", "Q4, Q6"],
        ],
      },
      { kind: "subhead", text: "`purchase` — the one that matters" },
      { kind: "para", text: "If this is wrong, every number downstream is wrong." },
      {
        kind: "code",
        label: "PURCHASE",
        lang: "js",
        code: `window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
  event: 'purchase',
  event_id: 'ord_10482_1730812345',   // stable and unique per order
  ecommerce: {
    transaction_id: '10482',          // order number as a string, not a UUID
    value: 128.50,                    // items only, ex. shipping and tax
    tax: 21.42,
    shipping: 4.95,
    currency: 'GBP',
    coupon: 'WELCOME10',
    items: [{
      item_id: 'SKU-4471',            // must match the merchant feed ID
      item_name: 'Example Product 30ml',
      item_brand: 'Example Brand',
      item_category: 'Category',
      item_category2: 'Subcategory',
      item_variant: '30ml',
      price: 64.25,                   // unit price, ex. tax
      quantity: 2,
      index: 0
    }]
  }
});`,
      },
      { kind: "subhead", text: "`user_data` — identity, hashed before it leaves the browser" },
      { kind: "para", text: "Raw email never enters the dataLayer." },
      {
        kind: "code",
        label: "USER_DATA",
        lang: "js",
        code: `window.dataLayer.push({
  event: 'user_data',
  user_id: 'cust_88213',              // stable CRM ID, not the session ID
  user_data: {
    sha256_email_address: '<sha256(lowercase(trim(email)))>',
    sha256_phone_number: '<sha256(E.164 phone)>',
    address: {
      sha256_first_name: '<sha256>',
      sha256_last_name:  '<sha256>',
      postal_code: 'sw1a1aa',         // lowercased, spaces stripped
      country: 'GB'
    }
  },
  customer_type: 'returning',         // new | returning | subscriber
  logged_in: true
});`,
      },
    ],
  },
  {
    id: "ga4",
    num: "06",
    kicker: "GA4",
    title: "Configuration",
    blocks: [
      { kind: "subhead", text: "Key events" },
      {
        kind: "table",
        head: ["Event", "Counting", "Value", "Why"],
        rows: [
          ["`purchase`", "Every", "From event", "Primary revenue outcome"],
          ["`begin_checkout`", "Every", "From event", "Mid-funnel optimisation signal"],
          ["`generate_lead`", "Once per session", "Static", "Stops form retries double-counting"],
          ["`subscription_started`", "Every", "From event", "Separated from one-off purchase for Q6"],
        ],
      },
      { kind: "subhead", text: "Custom definitions" },
      {
        kind: "para",
        text: "GA4 discards any parameter that isn’t registered, so this table isn’t optional.",
      },
      {
        kind: "table",
        head: ["Name", "Parameter", "Scope", "Purpose"],
        rows: [
          ["Customer type", "`customer_type`", "User", "New vs returning vs subscriber (Q6)"],
          ["Logged in", "`logged_in`", "User", "Segment authenticated behaviour"],
          ["Checkout step", "`checkout_step`", "Event", "Funnel exploration (Q2)"],
          ["Shipping tier", "`shipping_tier`", "Event", "Does free shipping move AOV"],
          ["Payment type", "`payment_type`", "Event", "Payment-method drop-off"],
          ["Form name", "`form_name`", "Event", "Which forms produce leads"],
          ["Search results count", "`results_count`", "Event", "Zero-result searches (Q5)"],
          ["Item list name", "`item_list_name`", "Event", "Merchandising placement performance"],
        ],
      },
      { kind: "subhead", text: "Property settings" },
      {
        kind: "list",
        items: [
          "Data retention at 14 months on event and user data — the maximum, and not the default.",
          "Google Signals on, reporting identity Blended.",
          "Internal traffic filter active and set to **Exclude**, with an override for remote staff.",
          "Unwanted referrals covering the payment gateway and checkout subdomain, so PayPal stops appearing as the source of your revenue.",
          "Cross-domain measurement across the main domain and checkout subdomain.",
          "BigQuery export on, daily plus streaming.",
          "Data-driven attribution, 90-day acquisition lookback.",
        ],
      },
    ],
  },
  {
    id: "consent",
    num: "07",
    kicker: "CONSENT",
    title: "Mode v2, advanced",
    blocks: [
      {
        kind: "lead",
        text: "Tags load in a cookieless state and send consent-aware pings, so modelled conversions stay available for users who decline.",
      },
      {
        kind: "table",
        head: ["Signal", "Default in EEA/UK", "Governs"],
        rows: [
          ["`ad_storage`", "denied", "Advertising cookies"],
          ["`ad_user_data`", "denied", "Sending user data for advertising"],
          ["`ad_personalization`", "denied", "Remarketing audience membership"],
          ["`analytics_storage`", "denied", "GA4 client ID cookie"],
          ["`functionality_storage`", "granted", "Site preferences"],
          ["`security_storage`", "granted", "Fraud prevention"],
        ],
      },
      {
        kind: "list",
        items: [
          "The default command fires from the CMP **before** the container loads. Order matters — if GTM loads first, the defaults mean nothing.",
          "`url_passthrough` and `ads_data_redaction` both enabled.",
          "The server container re-checks consent on arrival and drops any destination the user hasn’t consented to. Client-side consent is never the only gate.",
          "Consent state is recorded as a parameter, so you can measure your consent rate and size the modelled gap instead of guessing at it.",
        ],
      },
    ],
  },
  {
    id: "destinations",
    num: "08",
    kicker: "DESTINATIONS",
    title: "And why the numbers won’t match",
    blocks: [
      { kind: "subhead", text: "Meta Conversions API" },
      {
        kind: "para",
        text: "The browser pixel and the server event are both sent deliberately. Meta reconciles them into one conversion because they share an identifier — and that only works if the ID is generated once and reused.",
      },
      {
        kind: "table",
        head: ["Requirement", "Implementation"],
        rows: [
          ["`event_id`", "Generated once in the web container, sent to the pixel as `eventID` and to the server as `event_id`. Derived from the order number so it survives a refresh of the thank-you page."],
          ["`event_name`", "Identical string on both paths, casing included."],
          ["`action_source`", "`website` on both paths."],
          ["`event_time`", "Unix seconds from the same timestamp on both paths."],
          ["`fbp` / `fbc`", "Read from the `_fbp` and `_fbc` cookies and forwarded server-side. Without `fbc`, click-through attribution is lost."],
          ["User data", "Hashed email, phone, first and last name, postal code, country, plus client IP and user agent forwarded from the server."],
        ],
      },
      { kind: "subhead", text: "Google Ads enhanced conversions" },
      {
        kind: "list",
        items: [
          "Conversion linker on all pages so the GCLID lands in a first-party cookie.",
          "Enhanced conversions sent through the server container using the hashed identifiers from `user_data` — not by scraping the DOM of the confirmation page.",
          "Deduplicated by order ID so a refreshed confirmation page can’t inflate conversions.",
          "Customer Data Terms accepted in the Google Ads account before go-live. Enhanced conversions silently do nothing until they are.",
        ],
      },
      { kind: "subhead", text: "Expected variance" },
      {
        kind: "para",
        text: "Platforms will never agree exactly. The point of the plan is that the gap becomes explainable instead of mysterious. Agreed tolerances before go-live:",
      },
      {
        kind: "table",
        head: ["Comparison", "Acceptable variance", "Why the gap exists"],
        rows: [
          ["GA4 purchases vs backend orders", "≤ 2%", "Consent denial, ad blockers, bots"],
          ["GA4 revenue vs backend revenue", "≤ 2%", "Currency rounding, refund timing"],
          ["Meta reported vs GA4 last-click", "Materially higher", "View-through attribution and a 7-day click window — not an error"],
          ["Google Ads vs GA4 conversions", "≤ 10%", "Attribution model and conversion-window differences"],
        ],
      },
    ],
  },
  {
    id: "build",
    num: "09",
    kicker: "BUILD",
    title: "The tag sheet",
    blocks: [
      {
        kind: "lead",
        text: "Every tag traces to a section above. Abbreviated here to the ecommerce path.",
      },
      {
        kind: "table",
        head: ["Container", "Tag", "Trigger", "Consent required"],
        rows: [
          ["Web", "`GA4 - Config`", "Initialisation — All Pages", "`analytics_storage`"],
          ["Web", "`GA4 - Event - view_item`", "`CE - view_item`", "`analytics_storage`"],
          ["Web", "`GA4 - Event - add_to_cart`", "`CE - add_to_cart`", "`analytics_storage`"],
          ["Web", "`GA4 - Event - begin_checkout`", "`CE - begin_checkout`", "`analytics_storage`"],
          ["Web", "`GA4 - Event - purchase`", "`CE - purchase`", "`analytics_storage`"],
          ["Web", "`Meta - Pixel - Purchase`", "`CE - purchase`", "`ad_storage`, `ad_user_data`"],
          ["Web", "`Google Ads - Conversion Linker`", "All Pages", "`ad_storage`"],
          ["Server", "`GA4 - Server`", "`Client - GA4`", "`analytics_storage`"],
          ["Server", "`Meta - CAPI - Purchase`", "`Client - GA4`, event = purchase", "`ad_storage`, `ad_user_data`"],
          ["Server", "`Google Ads - Enhanced Conversion`", "`Client - GA4`, event = purchase", "`ad_storage`, `ad_user_data`"],
          ["Server", "`BigQuery - Raw Event Sink`", "`Client - GA4`, all events", "none — no marketing identifiers written"],
        ],
      },
    ],
  },
  {
    id: "qa",
    num: "10",
    kicker: "QA",
    title: "What sign-off actually means",
    blocks: [
      {
        kind: "lead",
        text: "Nothing is handed over until every row passes on production, verified twice: once by me, once by you on a real order.",
      },
      { kind: "subhead", text: "Per event" },
      {
        kind: "table",
        head: ["#", "Check", "Tool"],
        rows: [
          ["1", "Fires exactly once per action — no duplicates on refresh or back-navigation", "GTM Preview, GA4 DebugView"],
          ["2", "Every required parameter present and correctly typed", "GTM Preview"],
          ["3", "`items[]` populated with real IDs matching the merchant feed", "GTM Preview"],
          ["4", "`value` equals `sum(price × quantity)` for the items in the event", "Manual calculation"],
          ["5", "No PII in any GA4-bound parameter or in the page path", "Network tab"],
          ["6", "Event reaches the server container and the intended destinations", "Server container Preview"],
          ["7", "Tag does **not** fire when consent is denied", "Consent simulation"],
          ["8", "Behaves correctly on mobile Safari and in an ad-blocked session", "Real device, uBlock Origin"],
        ],
      },
      { kind: "subhead", text: "Reconciliation — the real test" },
      {
        kind: "list",
        items: [
          "Three live test orders: one guest, one logged-in, one with a discount code.",
          "For each, `transaction_id`, `value`, `tax`, `shipping` and item count match the backend order record exactly.",
          "After 72 hours, GA4 purchase count and revenue compared against backend orders for the same window, inside the tolerances in section 08.",
          "Meta shows the purchase event as deduplicated, with a browser and server share, and a match-quality score reported.",
          "Google Ads reports enhanced conversions as active with a matched-conversion rate.",
          "No orphan rows in BigQuery — every purchase has a matching order.",
        ],
      },
      { kind: "subhead", text: "Definition of done" },
      {
        kind: "list",
        items: [
          "Every event in section 05 fires correctly in production and appears in GA4.",
          "GA4 revenue reconciles to backend revenue inside tolerance over a rolling 7-day window.",
          "Meta purchase deduplication confirmed, match quality reported and at target.",
          "Google Ads enhanced conversions live and reporting a match rate.",
          "Consent Mode v2 verified in both granted and denied states.",
          "This document updated to as-built, and the container annotated to match.",
          "Handover session recorded — container walkthrough, plus how to add a new event without breaking the plan.",
        ],
      },
    ],
  },
  {
    id: "access",
    num: "11",
    kicker: "ACCESS",
    title: "What I need from you",
    blocks: [
      {
        kind: "table",
        head: ["System", "Access level", "Needed for"],
        rows: [
          ["Google Tag Manager", "Publish", "Web container build"],
          ["Google Analytics 4", "Editor / Administrator", "Property configuration, custom definitions"],
          ["Google Ads", "Standard", "Conversion actions, enhanced conversions"],
          ["Meta Business Manager", "Partner — pixel and dataset", "Pixel and CAPI configuration"],
          ["Google Cloud project", "Editor", "Server container hosting, BigQuery export"],
          ["DNS", "Record creation only", "`sgtm` subdomain CNAME"],
          ["Site / theme code", "Staging plus a deploy path", "dataLayer implementation"],
          ["CMP", "Admin", "Consent Mode v2 default state"],
        ],
      },
      {
        kind: "note",
        text: "**Typical shape of the work:** discovery and this document, 3–4 days. dataLayer implementation, 5–7 days, on your developers. Container build, 4–5 days. QA and reconciliation, 3–4 days. Handover, 1 day, with 30 days of support after.",
      },
    ],
  },
];

/** Words across every block, used to derive the reading time at build. */
function countWords(): number {
  let text = trackingPlanMeta.standfirst.join(" ") + " " + trackingPlanMeta.closing.body;
  for (const s of planSections) {
    text += ` ${s.kicker} ${s.title}`;
    for (const b of s.blocks) {
      switch (b.kind) {
        case "para":
        case "lead":
        case "subhead":
        case "note":
          text += " " + b.text;
          break;
        case "list":
          text += " " + b.items.join(" ");
          break;
        case "rules":
          text += " " + b.items.map((i) => `${i.term} ${i.text}`).join(" ");
          break;
        case "table":
          text += " " + b.head.join(" ") + " " + b.rows.flat().join(" ");
          break;
        case "code":
          text += " " + b.code;
          break;
      }
    }
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/** 200 wpm, rounded up — code blocks are skimmed, not read, but they are
 *  counted because they are the part people actually stop on. */
export const readingTimeMinutes = Math.max(1, Math.round(countWords() / 200));
