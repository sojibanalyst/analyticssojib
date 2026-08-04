/**
 * Single source of truth for every string, stat, link and testimonial on the
 * site. Components read from here — edit copy in this file, never in JSX.
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
  title: string;
  body: string;
  bullets: string[];
};

export type Capability = {
  code: string;
  status: string;
  title: string;
  body: string;
  tags: string[];
  /** qualitative outcome tiles — deliberately no numbers, see DESIGN-NOTES §3B */
  outcomes: string[];
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
  role?: string;
  quote?: string;
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
    | "shopify";
  /** brand colour, verbatim from the design */
  fill: string;
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

export const nav: NavLink[] = [
  { label: "SERVICES", href: "#services" },
  { label: "WORK", href: "#work" },
  { label: "REVIEWS", href: "#reviews" },
  { label: "ABOUT", href: "#about" },
  { label: "FAQ", href: "#faq" },
];

export const footerNav: NavLink[] = [
  { label: "WORK", href: "#work" },
  { label: "SERVICES", href: "#services" },
  { label: "FAQ", href: "#faq" },
  { label: "CONTACT", href: "#contact" },
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
    "Scope-dependent. We agree what’s in and what’s out before any work starts.",
  items: [
    {
      code: "S-01",
      duration: "5–7 DAYS",
      title: "GA4 setup & audit",
      body: "Every tag, trigger, event and data layer mapped against what your site actually does. You get a clean event taxonomy, the right key events, and a prioritised defect list.",
      bullets: [
        "Event taxonomy and key events",
        "No double-counting, no orphan tags",
        "Written fix plan you can hand to anyone",
      ],
    },
    {
      code: "S-02",
      duration: "1–2 WEEKS",
      title: "Tag Manager implementation",
      body: "A web container built to a written dataLayer spec, with triggers QA’d one by one. Ecommerce tracking for Shopify, WooCommerce or a custom stack — full funnel, with revenue.",
      bullets: [
        "dataLayer spec, documented",
        "Triggers QA’d event by event",
        "Shopify / WooCommerce / custom",
      ],
    },
    {
      code: "S-03",
      duration: "2–3 WEEKS",
      title: "Server-side GTM",
      body: "A GTM server container on your own subdomain: first-party cookies with a longer lifetime, resilience against ad blockers and ITP, and one clean event stream feeding every platform.",
      bullets: [
        "sGTM on your own subdomain",
        "First-party cookies, longer lifetime",
        "Resilient to ad blockers and ITP",
      ],
    },
    {
      code: "S-04",
      duration: "1–2 WEEKS",
      title: "CAPI, parity & reporting",
      body: "Meta Conversions API and Google Ads enhanced conversions, matched to GA4 and to your order table — then Looker Studio dashboards that answer business questions instead of counting sessions.",
      bullets: [
        "Meta CAPI + enhanced conversions",
        "Deduplicated event IDs",
        "Looker Studio, questions not vanity charts",
      ],
    },
  ] satisfies Service[],
};

/* -------------------------------------------------------------------------- */
/* 03 — What I fix. Capability cards, not case studies: no client names and    */
/*      no result figures, because none were supplied. See DESIGN-NOTES §3B.   */
/* -------------------------------------------------------------------------- */

export const work = {
  eyebrow: "03 / WHAT I FIX",
  title: "What actually breaks",
  intro:
    "Two failure modes account for most of the tracking work I do. Both are invisible until someone reconciles the numbers against the orders.",
  items: [
    {
      code: "CAP_01 / MEASUREMENT INTEGRITY",
      status: "FIXABLE",
      title: "Purchases that fire twice, or not at all",
      body: "A checkout with more than one path almost always tracks unevenly: one route double-fires the purchase, another misses it entirely, and a thank-you page refresh counts again. The fix is a deduplicated event stream keyed on the order ID, reconciled against your order export before anyone signs it off.",
      tags: ["GA4", "GTM", "SERVER-SIDE GTM", "ECOMMERCE"],
      outcomes: [
        "ONE EVENT PER ORDER",
        "REVENUE THAT RECONCILES",
        "REFRESH-SAFE PURCHASES",
        "DOCUMENTED DATALAYER",
      ],
    },
    {
      code: "CAP_02 / SIGNAL RECOVERY",
      status: "FIXABLE",
      title: "Conversions lost to consent gates and ad blockers",
      body: "Client-side tags fail quietly. A consent banner set to deny-by-default, an ad blocker, or ITP capping cookie lifetime each remove conversions without raising an error — so the number just drifts down. Server-side tagging and the Conversions API put the signal back on a first-party footing.",
      tags: ["SERVER-SIDE GTM", "META CAPI", "ENHANCED CONVERSIONS", "CONSENT MODE V2"],
      outcomes: [
        "FIRST-PARTY COOKIES",
        "LONGER COOKIE LIFETIME",
        "BETTER MATCH QUALITY",
        "CONSENT HANDLED PROPERLY",
      ],
    },
  ] satisfies Capability[],
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
  kicker: "CLIENT VIDEO REVIEWS",
  title: "Clients on the record",
  note: "Recorded by clients on Upwork engagements.",
  // `name`, `role` and `quote` stay unset until Sojib confirms each client
  // agreed to be named — the components degrade gracefully without them.
  items: [
    {
      id: "VUz-Al0nmz8",
      orientation: "portrait",
      label: "Play client testimonial video 1",
    },
    {
      id: "-YRJQLpl8rM",
      orientation: "landscape",
      label: "Play client testimonial video 2",
    },
    {
      id: "_uNS2rPx6sI",
      orientation: "portrait",
      label: "Play client testimonial video 3",
    },
  ] as Testimonial[],
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
  body: "No websites, no ads management, no growth retainers. Tracking is the whole job — which is why I can usually tell you within a day whether your problem is a tag, a template, a consent banner or a checkout extension. I’m based in Dhaka and work with clients across US and EU timezones, mostly through Upwork, where I’ve completed 51 projects.",
  pullquote:
    "I show my working. Every claim I make about your data comes with the query, the tag or the report behind it — so you can check it without taking my word for anything.",
  pullquoteAttribution: "SOJIB H. · DHAKA, BANGLADESH · UTC+6",
  chips: [
    "TOP RATED ON UPWORK",
    "MEASUREMENT SPECIALIST · NOT A GENERALIST",
    "REMOTE · UTC+6",
  ],
};

/* -------------------------------------------------------------------------- */
/* 07 — FAQ (drives FAQPage JSON-LD)                                           */
/* -------------------------------------------------------------------------- */

export const faq = {
  eyebrow: "07 / FAQ",
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
  eyebrow: "08 / CONTACT",
  title: "Send me your GA4 and your order total. I’ll tell you the gap.",
  body: "A 30-minute call, no deck. If your tracking is fine I’ll say so and you’ve lost half an hour.",
  calendlyHeading: "PICK A TIME",
  fallback: "Booking widget not loading? Open the scheduling page directly.",
};

export const footer = {
  builtWith: "BUILT WITH NEXT.JS",
};
