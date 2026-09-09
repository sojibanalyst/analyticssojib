import type { DocSection } from "@/components/DocArticle";

/**
 * Terms of service.
 *
 * Deliberately short, and deliberately about THIS site rather than a generic
 * SaaS product: there is no account, no subscription, no user-generated
 * content, so the usual three thousand words of account termination and
 * acceptable-use clauses would be describing a service that does not exist.
 *
 * The two clauses worth reading before publishing are `law` (jurisdiction) and
 * `liability` (the cap). Both are choices only Sojib can make, and both are
 * flagged in the PR rather than being quietly decided here.
 */

export const termsMeta = {
  title: "Terms",
  description:
    "What this site is, what the figures on it mean, and what does and does not create an agreement to work together.",
  updated: "9 September 2026",
  intro:
    "This is a marketing site for a one-person consultancy. Reading it, booking a call or sending an enquiry does not create a contract; an engagement starts when a written scope and a price are agreed. These terms cover the site itself.",
};

export const termsSections: DocSection[] = [
  {
    id: "what",
    heading: "What this site is",
    blocks: [
      {
        kind: "para",
        text: "analyticssojib.com describes conversion tracking work carried out by Sojib Hossain. It is a description of services, not an offer capable of acceptance. Nothing on it obliges either of us to anything.",
      },
    ],
  },

  {
    id: "prices",
    heading: "The prices are starting points",
    blocks: [
      {
        kind: "para",
        text: "Where a service card shows a figure, it is a starting price for that kind of work, not a quote. Real scope changes it in both directions.",
      },
      {
        kind: "para",
        text: "A fixed price is agreed in writing before any work begins. There is no hourly billing and no invoice you have not seen coming.",
      },
    ],
  },

  {
    id: "engagement",
    heading: "When an engagement actually starts",
    blocks: [
      {
        kind: "para",
        text: "When a written scope and a price are agreed, and not before. A booked call, an enquiry through the form, or a message on WhatsApp is a conversation.",
      },
      {
        kind: "para",
        text: "The engagement itself is governed by whatever is written down for it. Where that document and this page disagree, that document wins.",
      },
    ],
  },

  {
    id: "advice",
    heading: "The writing here is general, not tailored",
    blocks: [
      {
        kind: "para",
        text: "The blog and the tracking plan template describe how these systems behave in general. They are written carefully and they are not advice about your setup, which neither of us has looked at yet.",
      },
      {
        kind: "para",
        text: "Test anything you take from here against your own data before you rely on it. That is the argument the whole site is making anyway.",
      },
    ],
  },

  {
    id: "figures",
    heading: "The case studies and the figures on them",
    blocks: [
      {
        kind: "para",
        text: "The case studies describe real engagements. Client names are withheld and the screenshots are cropped to remove identifying detail, which is why they read as CASE_007 rather than as a brand.",
      },
      {
        kind: "para",
        text: "Every figure on them was reconciled against that client's own order data at the time. None of it is a prediction about your account. Tracking accuracy depends on your platform, your checkout, your consent setup and your traffic, and no result shown here is promised to anybody else.",
      },
      {
        kind: "para",
        text: "The review counts and the rating come from the linked Upwork profile and are accurate as at the date on this page.",
      },
    ],
  },

  {
    id: "calls",
    heading: "Booking a call",
    blocks: [
      {
        kind: "para",
        text: "The introductory call is thirty minutes and free, with nothing owed by either side afterwards. Cancel or reschedule from the Calendly confirmation, or just say so by email.",
      },
      {
        kind: "para",
        text: "If your tracking turns out to be fine, you will be told that on the call rather than sold something else.",
      },
    ],
  },

  {
    id: "ip",
    heading: "What you may copy",
    blocks: [
      {
        kind: "list",
        items: [
          "The tracking plan template at /tracking-plan is meant to be used. Copy it, adapt it, take it to another consultant. It is published to be useful, not to be gated.",
          "The blog posts may be quoted with a link back. Republishing one in full is not agreed.",
          "The case study screenshots may not be reproduced. They are cropped client material and are here to evidence a claim on this site, not to be circulated.",
          "The site's design, wording and code stay the property of Sojib Hossain.",
        ],
      },
    ],
  },

  {
    id: "third-parties",
    heading: "Other services on the page",
    blocks: [
      {
        kind: "para",
        text: "Booking goes through Calendly and the video reviews are hosted on YouTube. Using either means their terms apply to that part of it, not these. What each one receives is set out on the privacy page.",
      },
    ],
  },

  {
    id: "availability",
    heading: "Availability",
    blocks: [
      {
        kind: "para",
        text: "This is a marketing site, not a service you depend on. No uptime is promised, and pages can change or be withdrawn without notice.",
      },
    ],
  },

  {
    id: "liability",
    heading: "Liability",
    blocks: [
      {
        kind: "para",
        text: "To the extent the law allows, there is no liability for loss arising from acting on the general information published here without checking it against your own setup first.",
      },
      {
        kind: "para",
        text: "Liability for paid work is governed by the written scope for that engagement, not by this page. Nothing here limits liability for fraud, or for anything else that cannot lawfully be limited.",
      },
    ],
  },

  {
    id: "law",
    heading: "Governing law",
    blocks: [
      {
        kind: "para",
        text: "These terms are governed by the law of Bangladesh, where the practice is based, and the courts of Dhaka have jurisdiction. A written scope for a specific engagement may name a different law and forum, and where it does, it takes precedence.",
      },
    ],
  },

  {
    id: "changes",
    heading: "Changes",
    blocks: [
      {
        kind: "para",
        text: "The date at the top is the date this page last changed. The version in force for an engagement is the one published when its scope was agreed.",
      },
    ],
  },
];
