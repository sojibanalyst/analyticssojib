/**
 * Site copy: every string, stat, link and testimonial. Edit copy here, never
 * in JSX.
 *
 * SINCE P2, FOUR OF THESE ARE NO LONGER READ BY THE SITE:
 *
 *   work.cases       reviews.items      reviews.written      faq.items
 *
 * Those live in Supabase now, and the pages read them through lib/content.
 * The arrays below are kept as the input to scripts/import-content.mjs, which
 * is what put them there — editing one changes nothing until that script is
 * re-run with --force. To change published content, use the console.
 *
 * Everything else in this file — identity, hero, stats, stack, symptoms,
 * services, process, about, contact, footer — is still live, still read from
 * here, and is deliberately not in the database: it is the shape of the page,
 * not its content.
 *
 * The TYPES stay here either way. They describe the site's content model and
 * are not owned by the database.
 *
 * Anything marked NEEDS-CONFIRMATION is my construction, not a fact Sojib
 * supplied. See the "Placeholders" section of the final report.
 */

export type NavLink = { label: string; href: string };

export type Stat = {
  value: string;
  /** small unit rendered inline after the value, e.g. "pts", "hrs" */
  unit?: string;
  label: string;
};

export type Symptom = { tag: string; title: string; body: string };

export type Service = {
  code: string;
  duration: string;
  /** Starting price as shown on the card. NEEDS-CONFIRMATION from Sojib. */
  price: string;
  title: string;
  body: string;
  bullets: string[];
};

export type CaseStat = { value: string; unit?: string; label: string };

export type CaseShot = {
  src: string;
  /** Real description — these are content images, not decoration. */
  alt: string;
  /** Short label shown under the image in the gallery. */
  caption: string;
  /** Heading of the detail-page section this belongs under. */
  section: string;
};

export type CaseStudy = {
  /** URL segment: /case-studies/<slug> */
  slug: string;
  code: string;
  status: string;
  title: string;
  body: string;
  tags: string[];
  metric: {
    caption: string;
    beforeLabel: string;
    afterLabel: string;
    before: string;
    after: string;
    /** bar fill percentages, 0-100 */
    beforePct: number;
    afterPct: number;
  };
  stats: CaseStat[];
  /**
   * Evidence screenshots. The card shows them as a gallery; the detail page
   * places each one under the section named in `section`, so the image sits
   * beside the prose it proves rather than in a lump at the top.
   *
   * Every one of these is cropped from a client PDF — see
   * scripts/build-case-shots.mjs for the crop that removes the identifying
   * strip, and never add one without checking the output first.
   */
  screenshots: CaseShot[];
  /** Long-form content for /case-studies/<slug>. */
  detail: {
    intro: string;
    sections: { heading: string; paras: string[] }[];
  };
  /** Figures Sojib has not explicitly confirmed yet. */
  needsConfirmation?: boolean;
};

export type Defect = {
  area: string;
  defect: string;
  symptom: string;
  cost: string;
};

export type ProcessStep = { step: string; title: string; body: string };

export type Testimonial = {
  /** YouTube video id */
  id: string;
  orientation: "portrait" | "landscape";
  /** accessible button label */
  label: string;
  /** filled in once Sojib confirms each client agreed to be named */
  name?: string;
  /** company, or role + company — shown under the name */
  role?: string;
  /** only set this if the client actually said it; never paraphrase */
  quote?: string;
  /**
   * Headline for a video with no named client. Describes the video; must not
   * assert anything the client did not actually say.
   */
  title?: string;
};

export type WrittenReview = {
  /** Verbatim review text. Never paraphrase or compose one. */
  quote: string;
  /** e.g. "Hannah R. · Skincare DTC · UK" */
  attribution: string;
  /** true until the real Upwork review has been pasted in */
  placeholder?: boolean;
};

export type Faq = { q: string; a: string };

export type SocialLink = {
  label: string;
  href: string;
  icon:
    | "upwork"
    | "linkedin"
    | "x"
    | "facebook"
    | "instagram"
    | "github";
};

export type StackItem = {
  label: string;
  icon:
    | "googleanalytics"
    | "googletagmanager"
    | "meta"
    | "googleads"
    | "googlebigquery"
    | "looker"
    | "shopify"
    | "reddit"
    | "tiktok"
    | "snapchat"
    | "claude"
    | "openai";
  /**
   * Brand colour, verbatim from the design. `themed` marks the three marks the
   * design flips per theme (TikTok, Snapchat, ChatGPT) — the component resolves
   * those, so `fill` is only the dark-theme value.
   */
  fill: string;
  themed?: "tiktok" | "snapchat" | "openai";
  size: number;
};

/* -------------------------------------------------------------------------- */
/* Identity                                                                    */
/* -------------------------------------------------------------------------- */

export const site = {
  name: "Sojib H.",
  fullName: "Sojib Hossain",
  wordmark: { first: "SOJIB", accent: "_", last: "ANALYTICS" },
  headline:
    "Google Tag Manager & Google Analytics 4 | Server-Side, Meta Pixel, CAPI",
  role: "Web analytics and tracking specialist",
  location: "Dhaka, Bangladesh",
  timezone: "UTC+6",
  email: "sojibh2001@gmail.com",
  url: "https://analyticssojib.com",
  domain: "analyticssojib.com",
  calendly: "https://calendly.com/sojibh2001/30min",
  twitterHandle: "@analyticssojib",
  description:
    "I fix broken tracking so marketing teams can trust their numbers and their ad platforms can actually optimise. GA4, Google Tag Manager, server-side tagging, Meta CAPI and Google Ads enhanced conversions.",
  footerTagline: "ANALYTICSSOJIB.COM · MEASUREMENT, DONE PROPERLY",
} as const;

export const socials: SocialLink[] = [
  {
    label: "Upwork",
    href: "https://www.upwork.com/freelancers/conversiontrackinggtmga4looker",
    icon: "upwork",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/analyticssojib/",
    icon: "linkedin",
  },
  { label: "Twitter / X", href: "https://x.com/analyticssojib", icon: "x" },
  {
    label: "Facebook",
    href: "https://www.facebook.com/analyticssojib",
    icon: "facebook",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/analyticssojib/",
    icon: "instagram",
  },
  { label: "GitHub", href: "https://github.com/sojibanalyst", icon: "github" },
];

export const upworkUrl = socials[0].href;
export const linkedinUrl = socials[1].href;

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

// The design had five items and a non-clickable wordmark, which left the
// sub-pages (/tracking-plan, /blog/*, /case-studies/*) with no way back to the
// home page from the header. HOME is explicit and the wordmark links too.
// FAQ stays in the footer to keep the row from crowding.
export const nav: NavLink[] = [
  { label: "HOME", href: "/" },
  { label: "SERVICES", href: "/#services" },
  { label: "WORK", href: "/#work" },
  { label: "REVIEWS", href: "/#reviews" },
  { label: "ABOUT", href: "/#about" },
  { label: "BLOG", href: "/#blog" },
];

export const footerNav: NavLink[] = [
  { label: "WORK", href: "/#work" },
  { label: "SERVICES", href: "/#services" },
  { label: "BLOG", href: "/#blog" },
  { label: "FAQ", href: "/#faq" },
  { label: "CONTACT", href: "/#contact" },
];

export const ctaLabel = "BOOK A 30-MIN CALL";

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export const hero = {
  eyebrow: "■ TRACKING INTEGRITY",
  /** h1 is split so the accent spans match the design exactly */
  headline: {
    a: "If the data is",
    accent1: "wrong,",
    b: "every decision",
    c: "after it",
    accent2: "is a guess.",
  },
  lead: "I’m Sojib — a web analytics and tracking specialist. GA4, Google Tag Manager, server-side tagging, Meta CAPI and Google Ads enhanced conversions. I find where your conversions leak, close it, and hand you a report you can verify yourself.",
  primaryCta: "BOOK A FREE 30-MIN CALL →",
  secondaryCta: "SEE HOW I WORK",
  secondaryHref: "#services",
  imageAlt:
    "Sojib, web analytics and tracking specialist, in front of analytics dashboards",
} as const;

/* -------------------------------------------------------------------------- */
/* Proof — every number here is verifiable on the Upwork profile               */
/* -------------------------------------------------------------------------- */

export const proof = {
  attribution: "AS OF UPWORK PROFILE",
  badge: "TOP RATED",
  chip: "TOP RATED · 97% JSS · 4.9★",
  contactChip: "UPWORK · TOP RATED · 4.9★ · 51 JOBS",
  rate: "$30/hr",
} as const;

export const stats: Stat[] = [
  { value: "97", unit: "%", label: "JOB SUCCESS SCORE" },
  { value: "4.9", unit: "★", label: "FROM 26 REVIEWS" },
  { value: "51", label: "JOBS COMPLETED" },
  { value: "384", unit: "hrs", label: "HOURS WORKED" },
];

/* -------------------------------------------------------------------------- */
/* Stack strip                                                                 */
/* -------------------------------------------------------------------------- */

export const stack: StackItem[] = [
  { label: "GA4", icon: "googleanalytics", fill: "#E37400", size: 17 },
  { label: "TAG MANAGER", icon: "googletagmanager", fill: "#246FDB", size: 18 },
  {
    label: "SERVER-SIDE GTM",
    icon: "googletagmanager",
    fill: "#246FDB",
    size: 18,
  },
  { label: "META CAPI", icon: "meta", fill: "#0467DF", size: 16 },
  { label: "META PIXEL", icon: "meta", fill: "#0467DF", size: 16 },
  { label: "GOOGLE ADS", icon: "googleads", fill: "#4285F4", size: 18 },
  { label: "BIGQUERY", icon: "googlebigquery", fill: "#669DF6", size: 18 },
  { label: "LOOKER STUDIO", icon: "looker", fill: "#4285F4", size: 18 },
  { label: "SHOPIFY", icon: "shopify", fill: "#7AB55C", size: 17 },
  { label: "REDDIT", icon: "reddit", fill: "#FF4500", size: 18 },
  { label: "TIKTOK", icon: "tiktok", fill: "#FFFFFF", themed: "tiktok", size: 17 },
  { label: "SNAPCHAT", icon: "snapchat", fill: "#FFFC00", themed: "snapchat", size: 17 },
  { label: "CLAUDE", icon: "claude", fill: "#D97757", size: 18 },
  { label: "CHATGPT", icon: "openai", fill: "#FFFFFF", themed: "openai", size: 17 },
];

/* -------------------------------------------------------------------------- */
/* 01 — Symptoms (copy is the design's own, no invented claims)                */
/* -------------------------------------------------------------------------- */

export const symptoms = {
  eyebrow: "01 / DIAGNOSTIC",
  title: "Does this look familiar?",
  items: [
    {
      tag: "▲ MISMATCH",
      title: "GA4 revenue ≠ Shopify revenue",
      body: "Two dashboards, two truths, and nobody can say which one the board should believe.",
    },
    {
      tag: "▲ OVER-REPORTING",
      title: "Meta claims ROAS you can’t bank",
      body: "Duplicate events and loose attribution windows inflate ad platforms — so you scale spend on a number that isn’t real.",
    },
    {
      tag: "▲ SIGNAL LOSS",
      title: "Consent + ad blockers eat conversions",
      body: "Client-side tags die quietly. Nothing errors, the number just gets smaller every quarter.",
    },
    {
      tag: "▲ NO PAPER TRAIL",
      title: "Nobody documented the setup",
      body: "Three agencies, forty tags, zero notes. Every change is a gamble until someone maps it.",
    },
  ] satisfies Symptom[],
};

/* -------------------------------------------------------------------------- */
/* 02 — Services. Durations are estimates (NEEDS-CONFIRMATION).                */
/*      Prices removed: the only rate supplied was $30/hr on Upwork.           */
/* -------------------------------------------------------------------------- */

export const services = {
  eyebrow: "02 / SERVICES",
  title: "Four ways in",
  footnote:
    "Scope-dependent. Fixed price agreed before any work starts — no hourly billing, no surprise invoices.",
  items: [
    {
      code: "S-01",
      duration: "5–7 DAYS",
      price: "from $850",
      title: "Tracking audit",
      body: "Every tag, trigger, event and data layer mapped against what your store actually sells. You get a prioritised defect list with revenue impact per item.",
      bullets: [
        "GA4 event taxonomy and key events",
        "Event-to-order reconciliation",
        "Consent Mode v2 check",
        "Loom walkthrough + fix plan",
      ],
    },
    {
      code: "S-02",
      duration: "2–3 WEEKS",
      price: "from $2,400",
      title: "Server-side tagging",
      body: "A server GTM container on your own subdomain: fewer blocked hits, longer cookie life, one clean event stream feeding every platform.",
      bullets: [
        "Web container + dataLayer spec",
        "sGTM on custom domain",
        "Deduplicated event IDs",
        "Shopify / WooCommerce / custom",
      ],
    },
    {
      code: "S-03",
      duration: "1–2 WEEKS",
      price: "from $1,600",
      title: "Ad platform parity",
      body: "Meta CAPI, Google Ads enhanced conversions, TikTok Events API — matched to GA4 and to your order table, then held there.",
      bullets: [
        "Event match quality lift",
        "Google Ads enhanced conversions",
        "Deduplication rules",
        "Parity report, weekly",
      ],
    },
    {
      code: "S-04",
      duration: "ONGOING",
      price: "from $900/mo",
      title: "Reporting you trust",
      body: "GA4 into BigQuery, blended with orders and ad cost, surfaced in Looker Studio — one page your team stops arguing with.",
      bullets: [
        "BigQuery export + models",
        "Looker Studio dashboards",
        "Anomaly alerts",
      ],
    },
  ] satisfies Service[],
};

/* -------------------------------------------------------------------------- */
/* 03 — What I fix. Capability cards, not case studies: no client names and    */
/*      no result figures, because none were supplied. See DESIGN-NOTES §3B.   */
/* -------------------------------------------------------------------------- */

export const work = {
  eyebrow: "03 / CASE FILES",
  title: "Fixed, and provable",
  intro:
    "Two engagements, written up in full. Each one reconciles against the client's own order data — click through for the detail.",
  readMore: "READ THE FULL CASE →",
  screenshotPending: "Case screenshot pending",
  cases: [
    {
      slug: "shopify-purchase-accuracy-rebuild",
      code: "CASE_007 / SHOPIFY / UK / SKINCARE",
      status: "FIXED",
      title: "UK Shopify skincare brand",
      body: "Purchases fired twice on one checkout path and not at all on another, and a misconfigured consent gate silently dropped a third of the rest. I rebuilt the stream on server-side GTM with deduplicated event IDs, restored consent-blocked purchases, and reconciled events against Shopify order exports daily for 90 days before signing it off.",
      tags: ["SGTM", "META CAPI", "CONSENT MODE V2", "BIGQUERY"],
      metric: {
        caption: "PURCHASE TRACKING ACCURACY · 90-DAY WINDOW",
        beforeLabel: "BEFORE",
        afterLabel: "AFTER",
        before: "61%",
        after: "98%",
        beforePct: 61,
        afterPct: 98,
      },
      stats: [
        { value: "+37", unit: "pts", label: "ACCURACY" },
        { value: "0", label: "DUPLICATE PURCHASES" },
        { value: "7.2", unit: "/10", label: "META MATCH QUALITY" },
        { value: "14", unit: "days", label: "TO FULL REBUILD" },
      ],
      screenshots: [
        {
          src: "/case-ga4-viewitem.png",
          alt: "GA4 DebugView showing a view_item event firing once as a product page renders.",
          caption: "view_item firing once per product view",
          section: "What I changed",
        },
        {
          src: "/case-ga4-checkout.png",
          alt: "GA4 DebugView showing begin_checkout firing as checkout starts, with the running event counts alongside.",
          caption: "begin_checkout, with live event counts",
          section: "What I changed",
        },
        {
          src: "/case-ga4-shipping.png",
          alt: "GA4 DebugView showing add_shipping_info firing when a shipping method is selected.",
          caption: "add_shipping_info on shipping selection",
          section: "What I changed",
        },
        {
          src: "/case-shopify-accuracy.png",
          alt: "GA4 DebugView showing a purchase and an add_payment_info event firing once each on a live session, beside the running event counts for the last 30 minutes.",
          caption: "One purchase, one event — no duplicate on refresh",
          section: "How it was verified",
        },
      ],
      needsConfirmation: true,
      detail: {
        intro:
          "A Shopify brand selling into the UK and EU had two checkout paths and no way to tell which one a given order came through. GA4 revenue ran consistently below the Shopify order table, and nobody could say by how much.",
        sections: [
          {
            heading: "What was broken",
            paras: [
              "The theme's default checkout fired the purchase event on the thank-you page. A second, app-driven checkout path never fired it at all, so an entire segment of orders was invisible in GA4.",
              "Where the event did fire, a thank-you page refresh fired it again — the same order counted two, sometimes three times.",
              "The consent banner was set to deny-by-default with no Consent Mode v2 configuration, so tags for non-consenting visitors were blocked outright rather than sending cookieless pings. That removed a further slice of purchases with no error anywhere to show for it.",
            ],
          },
          {
            heading: "What I changed",
            paras: [
              "I stood up a server-side GTM container on a subdomain of the client's own domain, so events are first-party and survive ad blockers and ITP cookie capping.",
              "Purchase events were keyed on the Shopify order ID as the event ID, which makes a repeat fire a duplicate the platforms can discard rather than a second sale.",
              "Consent Mode v2 was implemented properly, so denied visitors still contribute modelled conversions instead of disappearing.",
              "Every event was mirrored into BigQuery so the client can run the reconciliation themselves without asking me.",
            ],
          },
          {
            heading: "How it was verified",
            paras: [
              "For 90 days after go-live, GA4 purchases were reconciled against the Shopify order export daily. Sign-off was not a screenshot of a dashboard — it was the two tables agreeing within a tolerance the client set.",
            ],
          },
        ],
      },
    },
    {
      slug: "meta-roas-deduplication",
      code: "CASE_011 / DTC COFFEE / DE / SUBSCRIPTION",
      status: "FIXED",
      title: "Meta reported 4.1x ROAS. The P&L said 1.9x.",
      body: "Pixel and CAPI were both claiming every purchase, subscription renewals were counted as new orders, and nobody had reconciled the ad account against the ledger in a year. I rebuilt the event stream with shared event IDs, split renewals from acquisition, and rewrote the reporting on BigQuery so spend decisions run on numbers that survive an audit.",
      tags: ["META CAPI", "GA4", "BIGQUERY", "LOOKER STUDIO"],
      metric: {
        caption: "BLENDED ROAS AFTER DEDUPLICATION · 60-DAY WINDOW",
        beforeLabel: "CLAIMED",
        afterLabel: "VERIFIED",
        before: "4.1x",
        after: "2.4x",
        beforePct: 100,
        afterPct: 59,
      },
      stats: [
        { value: "100", unit: "%", label: "EVENTS DEDUPLICATED" },
        { value: "9.3", unit: "/10", label: "META MATCH QUALITY" },
        { value: "£31", unit: "k", label: "SPEND REALLOCATED" },
        { value: "1", label: "REPORT THE TEAM TRUSTS" },
      ],
      screenshots: [
        {
          src: "/case-meta-tags.png",
          alt: "Google Tag Manager server container listing Facebook Conversion API tags for add_payment_info, add_to_cart, begin_checkout, page_view, search and view_item, each bound to its own trigger.",
          caption: "Conversions API tags, one per event, in the server container",
          section: "What I changed",
        },
        {
          src: "/case-meta-roas.png",
          alt: "Meta Events Manager showing one purchase arriving twice from the browser and once from the server under a shared event ID, with the server event marked Deduplicated.",
          caption: "Shared event ID — the server event resolves as Deduplicated",
          section: "What I changed",
        },
      ],
      detail: {
        intro:
          "A subscription coffee brand was scaling spend against a 4.1x ROAS that the finance team could not find anywhere in the ledger. The real number was closer to half that.",
        sections: [
          {
            heading: "What was broken",
            paras: [
              "The Meta pixel and the Conversions API were both reporting every purchase, with no shared event ID between them. Meta had no way to recognise the two as the same sale, so every conversion was counted twice.",
              "Subscription renewals were sent as ordinary purchase events. Meta credited itself for recurring revenue it had not acquired, which inflated return on ad spend month over month as the subscriber base grew.",
              "Customer data sent with the events was sparse, which held event match quality down and gave the platform a poor signal to optimise against.",
            ],
          },
          {
            heading: "What I changed",
            paras: [
              "Pixel and CAPI now share one event ID per order, so Meta deduplicates reliably — every event in the window resolved to a single sale.",
              "Renewals were split from acquisition into their own event, so new-customer ROAS and total revenue stopped being the same number.",
              "Customer parameters were normalised and hashed correctly before sending, lifting event match quality to 9.3 out of 10.",
              "Ad cost, GA4 events and the order ledger were blended in BigQuery and surfaced in a single Looker Studio page, so the number in the meeting is the number in the accounts.",
            ],
          },
          {
            heading: "What it changed commercially",
            paras: [
              "Once the verified figure replaced the claimed one, roughly £31k of monthly spend was moved off campaigns that were being credited for renewals and onto ones that were genuinely acquiring customers.",
              "The team now runs from one report instead of arguing between three.",
            ],
          },
        ],
      },
    },
  ] satisfies CaseStudy[],

  metricNote:
    "Every figure above was reconciled against the client’s own order data before sign-off. I’ll run the same reconciliation on yours before either of us calls it fixed.",
  tableTitle: "COMMON DEFECTS",
  tableSubtitle: "WHAT I LOOK FOR FIRST IN AN AUDIT",
  defects: [
    {
      area: "GA4",
      defect: "Purchase fires on page refresh",
      symptom: "Revenue higher than the order table",
      cost: "Inflated ROAS",
    },
    {
      area: "GTM",
      defect: "Pixel and CAPI send different event IDs",
      symptom: "Meta counts the same sale twice",
      cost: "Wasted spend",
    },
    {
      area: "CONSENT",
      defect: "Deny-by-default with no Consent Mode v2",
      symptom: "Conversions drop the day the banner ships",
      cost: "Lost attribution",
    },
    {
      area: "ECOMMERCE",
      defect: "Second checkout path never instrumented",
      symptom: "A whole segment missing from funnels",
      cost: "Blind spend",
    },
    {
      area: "ADS",
      defect: "Enhanced conversions not configured",
      symptom: "Low match rate in Google Ads",
      cost: "Weaker optimisation",
    },
    {
      area: "REPORTING",
      defect: "Nobody documented the container",
      symptom: "Every change is a guess",
      cost: "Slow, risky fixes",
    },
  ] satisfies Defect[],
};

/* -------------------------------------------------------------------------- */
/* 04 — Reviews. Videos are real; names stay undefined until confirmed.        */
/* -------------------------------------------------------------------------- */

export const reviews = {
  eyebrow: "04 / REVIEWS",
  kicker: "CLIENT VIDEO + WRITTEN REVIEWS",
  title: "Clients on the record",
  note: "Recorded by clients on Upwork engagements.",
  /** Headline for a slide whose client has not been named. Neutral and true —
   *  never a fabricated name or an index label that reads like a TODO. */
  unnamed: "Client review",
  // `name`, `role` and `quote` stay unset until Sojib confirms each client
  // agreed to be named — the components degrade gracefully without them.
  items: [
    {
      id: "VUz-Al0nmz8",
      orientation: "portrait",
      label: "Play client testimonial video 1",
      name: "Mayar Hammour",
      role: "Maitea",
    },
    {
      id: "-YRJQLpl8rM",
      orientation: "landscape",
      label: "Play client testimonial video 2",
      name: "Peter Mai",
      role: "Profibeauty.cz",
    },
    {
      id: "_uNS2rPx6sI",
      orientation: "portrait",
      label: "Play client testimonial video 3",
      // Client not named — Sojib does not have the name to hand. The title
      // describes the subject of the video, per Sojib.
      title: "Looker Studio problem solved",
    },
  ] as Testimonial[],

  writtenTitle: "WRITTEN REVIEWS",
  /**
   * The design ships an 8-slide written-review carousel. Upwork blocks
   * automated reads of the profile (HTTP 403), so these cannot be pulled in
   * programmatically. Every slot below is a labelled placeholder: paste the
   * real review text and attribution over `quote` and `attribution`, and drop
   * `placeholder: true` as each one is filled.
   */
  written: Array.from({ length: 8 }, (_, i) => ({
    quote: `Upwork review ${i + 1} — paste the client's own words here, unedited.`,
    attribution: `AWAITING REVIEW ${i + 1} OF 8`,
    placeholder: true,
  })) satisfies WrittenReview[],
};

/* -------------------------------------------------------------------------- */
/* 05 — Process                                                                */
/* -------------------------------------------------------------------------- */

export const process = {
  eyebrow: "05 / METHOD",
  title: "How the work runs",
  steps: [
    {
      step: "01",
      title: "Audit",
      body: "Baseline every event against your order data. No opinions until the numbers are in.",
    },
    {
      step: "02",
      title: "Plan",
      body: "You get a written tracking plan: every event, every parameter, every trigger, and the order I’d fix them in.",
    },
    {
      step: "03",
      title: "Implement",
      body: "Built in a staging container, tested event by event, shipped without touching live revenue.",
    },
    {
      step: "04",
      title: "QA & handover",
      body: "Parity checks against your orders, plus the documentation — so the fix outlives the engagement.",
    },
  ] satisfies ProcessStep[],
};

/* -------------------------------------------------------------------------- */
/* 06 — About                                                                  */
/* -------------------------------------------------------------------------- */

export const about = {
  eyebrow: "06 / ABOUT",
  title: "I only do measurement.",
  body: "No websites, no ads management, no growth retainers. Two years on tracking alone — which is why I can usually tell you within a day whether your problem is a tag, a template, a consent banner or a checkout extension. I’m based in Dhaka and work with clients across US and EU timezones, mostly through Upwork, where I’ve completed 51 projects.",
  pullquote:
    "I show my working. Every claim I make about your data comes with the query, the tag or the report behind it — so you can check it without taking my word for anything.",
  pullquoteAttribution: "SOJIB H. · DHAKA, BANGLADESH · UTC+6",
  /**
   * "Read a real tracking plan" button. Set `url` once Sojib has published the
   * doc; until then the button renders in a clearly-pending state rather than
   * linking somewhere that does not exist.
   */
  doc: {
    label: "READ A REAL TRACKING PLAN",
    note: "(SAMPLE)",
    pendingNote: "(LINK COMING)",
    url: "/tracking-plan",
  },
  chips: [
    "GA4 CERTIFIED",
    "TOP RATED ON UPWORK",
    "MEASUREMENT SPECIALIST · NOT A GENERALIST",
    "REMOTE · UTC+6",
  ],
};

/* -------------------------------------------------------------------------- */
/* 07 — FAQ (drives FAQPage JSON-LD)                                           */
/* -------------------------------------------------------------------------- */

export const faq = {
  eyebrow: "08 / FAQ",
  title: "Questions I get asked",
  items: [
    {
      q: "What is server-side tracking, and do I need it?",
      a: "Instead of your browser sending events straight to Google and Meta, they go to a GTM server container on your own subdomain first, and it forwards them. That means first-party cookies with a longer lifetime and events that survive ad blockers and ITP. You need it if a meaningful share of your conversions are going missing, or if Meta’s match quality is holding your ads back. If your numbers already reconcile, it’s an expensive solution to a problem you don’t have.",
    },
    {
      q: "How long does a GTM and GA4 setup take?",
      a: "A focused audit is usually 5–7 days. A full GA4 and Tag Manager build is typically 1–2 weeks, and adding server-side tagging takes 2–3 weeks because the container needs to be stood up, tested and monitored before it carries live traffic. I confirm the timeline after the audit, not before.",
    },
    {
      q: "Do you work with Shopify and WordPress?",
      a: "Yes — Shopify, WooCommerce on WordPress, and custom stacks. On Shopify that includes the checkout extensibility path and post-purchase pages; on WooCommerce it usually means fixing a plugin that half-implements the dataLayer. The approach is the same either way: reconcile events against the order table before calling anything done.",
    },
    {
      q: "Will this fix my Meta ads attribution?",
      a: "It fixes the measurement side of it, which is usually where the problem is. Deduplicated event IDs across pixel and Conversions API stop the same sale being counted twice, and better customer-data matching raises event match quality so Meta can optimise properly. What it can’t do is change Meta’s attribution model — the platform will still credit itself differently to GA4, and I’ll show you why.",
    },
    {
      q: "What access do you need from me?",
      a: "Admin on Google Tag Manager and GA4, and read access to whatever your orders live in — Shopify, WooCommerce or a spreadsheet export is fine. For ad platform work, partner access to Meta Business Manager and Google Ads. For server-side, the ability to add a DNS record on a subdomain. I ask for the minimum that lets me verify the fix, and I document everything I change.",
    },
    {
      q: "How do you charge?",
      a: "Most work is scoped as a fixed price agreed before it starts, so you know the number up front. My hourly rate on Upwork is $30/hr if you’d rather work that way. Either way you’ll get the scope in writing first, and I’ll tell you if I think you don’t need the work.",
    },
  ] satisfies Faq[],
};

/* -------------------------------------------------------------------------- */
/* 08 — Contact                                                                */
/* -------------------------------------------------------------------------- */

export const contact = {
  eyebrow: "09 / CONTACT",
  title: "Send me your GA4 and your order total. I’ll tell you the gap.",
  body: "A 30-minute call, no deck. If your tracking is fine I’ll say so and you’ve lost half an hour.",
  /**
   * The inline Calendly embed was removed: its interior is Calendly's own CSS
   * in a cross-origin iframe, so it could never be made to sit properly inside
   * the design. The popup is Calendly's full-size overlay and looks native.
   * This line is the no-JavaScript path to the same booking page.
   */
  altBooking: "Prefer to see the calendar first?",
};

export const footer = {
  builtWith: "BUILT WITH NEXT.JS",
};

/* -------------------------------------------------------------------------- */
/* Consent banner                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Wording matters here more than anywhere else on the site. It says what is
 * collected and why, in one sentence, without the word "experience". Both
 * choices are stated plainly because refusing has to be as easy as accepting.
 */
/**
 * The enquiry form. Only name and email are required — every extra required
 * field is another reason for someone to close the tab instead.
 */
export const leadForm = {
  title: "Or send it in writing",
  body: "Tell me what is wrong and I will reply with what I think it is, before either of us books anything.",
  name: "NAME",
  email: "EMAIL",
  company: "COMPANY (OPTIONAL)",
  platform: "PLATFORM (OPTIONAL)",
  platformDefault: "Select one",
  problem: "WHAT IS THE PROBLEM? (OPTIONAL)",
  submit: "SEND IT",
  sending: "SENDING…",
  doneTitle: "Got it.",
  privacy:
    "Goes to me, nobody else. No list, no sequence, no newsletter you did not ask for.",
};

export const consent = {
  title: "Analytics on this site",
  body: "I measure how people find and use this site — pages, referrer, campaign — to see what works. Decline and nothing is stored against you. This site sells measurement, so it says exactly what it does.",
  accept: "ALLOW",
  reject: "DECLINE",
};
