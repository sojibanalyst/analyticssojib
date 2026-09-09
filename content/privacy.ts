/**
 * The privacy notice.
 *
 * EVERY CLAIM ON THIS PAGE WAS READ OUT OF THE CODE, not copied from a
 * template. The cookie names and lifetimes come from lib/attribution.ts,
 * lib/collector.ts and app/api/collect/route.ts; the retention windows come
 * from the migrations that enforce them; the "no IP is stored" line comes from
 * the collector, which records the two-letter country header and nothing else.
 *
 * That is the point of publishing one on this site in particular. A privacy
 * page that describes a generic website is worth nothing on a site that sells
 * accurate measurement. If it is wrong here, nothing else on the domain is
 * worth believing either.
 *
 * IF THE TRACKING CHANGES, THIS FILE CHANGES IN THE SAME COMMIT. The most
 * likely change is a GTM container id being pasted into Settings, which turns
 * on a third party this page currently says is absent. See
 * docs/consent-re-enable.md before that happens.
 */

import type { DocSection } from "@/components/DocArticle";

export const privacyMeta = {
  title: "Privacy",
  description:
    "What this site records, what it does not, how long any of it is kept, and how to have it deleted. Written from the code, not from a template.",
  /** Bump in the same commit as any change to what is collected. */
  updated: "9 September 2026",
  intro:
    "This page describes what analyticssojib.com actually does, taken from the code that does it. Where a lifetime or a retention window is given, it is the value the software enforces, not an intention.",
};

export const privacySections: DocSection[] = [
  {
    id: "summary",
    heading: "The short version",
    blocks: [
      {
        kind: "list",
        items: [
          "Your IP address is never stored. The hosting layer sees it, as it must to serve you a page; what reaches the database is a two-letter country code and nothing more.",
          "There are no advertising or social tracking scripts on this site. No Meta pixel, no TikTok pixel, no LinkedIn tag, no Google Ads tag.",
          "No Google Tag Manager container is loaded, because none is configured yet. When one is, this page is updated in the same change.",
          "Nothing you type is sold, shared with a marketing platform, or added to a mailing list. There is no mailing list.",
          "Two cookies are set, both HttpOnly, so no script on the page can read either of them.",
          "Ask and everything about you is deleted. What that involves is set out below, including the one thing that is kept.",
        ],
      },
    ],
  },

  {
    id: "reading",
    heading: "What is recorded when you only read the site",
    blocks: [
      {
        kind: "para",
        text: "Two things: a short-lived session identifier, and a record of how you arrived. Both are stored in HttpOnly cookies, which means they are sent back to this server and cannot be read by JavaScript running on the page.",
      },
      {
        kind: "para",
        text: "Alongside those, the database keeps a row for the visit and a row for each of a small number of named events. A visit row holds the page you landed on, the referrer, any campaign parameters in the URL, your browser's user-agent string, and the country your request came from. An event row holds an event id, the path it happened on, a few parameters describing the event, and the consent state at the time.",
      },
      {
        kind: "para",
        text: "The country is taken from a header the host adds after resolving your IP. The IP itself is not written down anywhere by this site.",
      },
    ],
  },

  {
    id: "attribution",
    heading: "The advertising click identifiers",
    blocks: [
      {
        kind: "para",
        text: "If you arrive from an advertisement, the URL usually carries an identifier for that click. This site reads it and keeps it, because reconciling advertising spend against real enquiries is the work it exists to do.",
      },
      {
        kind: "list",
        items: [
          "Google Ads: gclid, wbraid, gbraid",
          "Meta: fbclid",
          "TikTok: ttclid",
          "Microsoft Advertising: msclkid",
          "LinkedIn: li_fat_id",
        ],
      },
      {
        kind: "para",
        text: "These are stored with the first and last source that brought you here, in the attribution cookie, for ninety days. They are treated as personal data on this site and are deleted along with everything else when you ask.",
      },
      {
        kind: "para",
        text: "They are captured on the server, in one place, and never read or written by a script in your browser.",
      },
    ],
  },

  {
    id: "sent",
    heading: "What you send deliberately",
    blocks: [
      {
        kind: "para",
        text: "The enquiry form asks for a name and an email address, and optionally a company, a platform and a description of the problem. It goes into the database and to Sojib. It is not added to a list and no sequence of emails follows it.",
      },
      {
        kind: "para",
        text: "If the form refuses a submission, because it looked automated or because a field failed validation, what you typed is kept for thirty days rather than thrown away, so that a real person wrongly caught can be found and answered. After thirty days the database deletes those rows itself.",
      },
      {
        kind: "para",
        text: "If you book a call, this site records the visit's attribution and generates an opaque reference for it. Calendly is given that reference. It is not given your advertising click identifier. A booking record that is never claimed by a real booking is deleted after thirty days, automatically.",
      },
    ],
  },

  {
    id: "cookies",
    heading: "Cookies",
    blocks: [
      {
        kind: "table",
        head: ["Cookie", "What it is for", "Lifetime", "Readable by scripts"],
        rows: [
          [
            "sf_sid",
            "Groups the pages of one visit together so a session can be counted once.",
            "30 minutes, extended by activity",
            "No. HttpOnly",
          ],
          [
            "sf_attr_1",
            "First and last source, campaign parameters and any advertising click identifier.",
            "90 days",
            "No. HttpOnly",
          ],
        ],
      },
      {
        kind: "para",
        text: "That is the complete list. There is no analytics cookie, because no analytics container is loaded. Both cookies are SameSite=Lax and are set as Secure over HTTPS.",
      },
    ],
  },

  {
    id: "others",
    heading: "Other companies involved",
    blocks: [
      {
        kind: "list",
        items: [
          "Vercel hosts the site. Every request passes through it, so it sees your IP address and request headers as part of serving the page.",
          "Supabase provides the database, in its Mumbai region. The rows described above are stored there.",
          "Calendly handles booking, and only when you choose to open it. Whatever you give Calendly is covered by Calendly's own privacy policy.",
          "YouTube hosts the client video reviews. The still images on the reviews section are loaded from Google's image server when the page loads. The player itself is the no-cookie variant and is only loaded after you press play.",
          "Google Tag Manager is not loaded at all. No container identifier is configured, so no container script is served.",
        ],
      },
    ],
  },

  {
    id: "consent",
    heading: "Why there is no cookie banner",
    blocks: [
      {
        kind: "para",
        text: "Because there is currently nothing on the site that one would gate. No advertising or analytics container loads, and the two cookies that are set are strictly functional: one groups a visit, one remembers where the visit came from.",
      },
      {
        kind: "para",
        text: "Every event is recorded with a consent state of \"not asked\", which is deliberately not the same value as \"denied\". Collapsing the two would mean claiming a refusal that nobody made.",
      },
      {
        kind: "para",
        text: "If a tag manager container is added and this site serves visitors in the UK or the EU, a consent interface goes in before the container does, and this page is rewritten in the same change.",
      },
    ],
  },

  {
    id: "retention",
    heading: "How long things are kept",
    blocks: [
      {
        kind: "table",
        head: ["What", "How long", "Enforced by"],
        rows: [
          ["Session cookie", "30 minutes from your last request", "The cookie itself"],
          ["Attribution cookie", "90 days", "The cookie itself"],
          ["Refused form submissions", "30 days, then deleted", "The database, automatically"],
          ["Unclaimed booking records", "30 days, then deleted", "The database, automatically"],
          ["Enquiries and event rows", "Until you ask for them to be deleted", "On request"],
        ],
      },
    ],
  },

  {
    id: "rights",
    heading: "Getting your data deleted",
    blocks: [
      {
        kind: "para",
        text: "Email or message on WhatsApp and say so. You do not need to give a reason, and you do not need to have been a client.",
      },
      {
        kind: "para",
        text: "Erasure removes the enquiry row and everything personal on it, including the advertising click identifiers. Deleting an enquiry while keeping the click that produced it would be erasure in name only. Any booking record tied to it goes at the same time.",
      },
      {
        kind: "para",
        text: "One thing is kept, and it is worth being explicit about it. The event row recording that an enquiry happened stays, stripped of everything that points at a person: the page path is removed, because it can carry an advertising identifier in its query string, and the parameters are reduced to the fact that a form was submitted and that the row was erased. A conversion that happened, happened, and deleting the event would quietly change a past month's totals.",
      },
      {
        kind: "para",
        text: "The fact of a deletion is logged with a masked address of the form z…l@example.com: enough to recognise a row that was deleted on purpose, not enough to reconstitute the person it belonged to.",
      },
      {
        kind: "para",
        text: "You can also ask for a copy of what is held, or for a correction. The same address works.",
      },
    ],
  },

  {
    id: "changes",
    heading: "Changes to this page",
    blocks: [
      {
        kind: "para",
        text: "The date at the top is the date this page last changed. It is written from the code, so it is expected to change whenever what the site collects changes, and in the same release rather than afterwards.",
      },
    ],
  },
];
