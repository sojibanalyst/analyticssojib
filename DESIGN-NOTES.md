# DESIGN-NOTES.md

Implementation map for **`Home - Signal Floor.dc.html`**
(Claude Design project `b8db6e0d-144d-4f0e-a9c0-586e313dccf1`).

Read section 3 first — the design ships a lot of invented content that your
brief's rule 8 forbids me from publishing. I need decisions there before I build.

---

## 1. What I imported

| Item | Result |
|---|---|
| `Home - Signal Floor.dc.html` | 226 KB, imported and parsed |
| `support.js` / `image-slot.js` | Claude Design runtime — behaviour ported by hand, not shipped |
| Design tokens | Extracted → `app/globals.css` (done) |
| Hero photos | 2 real embedded JPEGs extracted → `public/hero-dark.jpg` (1440×810), `public/hero-light.jpg` (1200×675) |
| Sibling files | `Mobile 375 - Signal Floor.html` kept as the 375px reference |

**Theme.** The design is **dark by default** with a working light theme via
`data-theme="light"` and a header toggle. That's a section the brief doesn't
mention — I'm keeping it, since the design is the source of truth.

**Fonts.** JetBrains Mono (400/500/700/800) is the primary face — 161 of 179
inline `font-family` declarations. Archivo (400/500/600/700) carries long-form
prose only. Both via `next/font/google`, self-hosted, no blocking `<link>`.

**Contrast.** I checked every text token against `--bg` and `--surface` in both
themes. **All pass 4.5:1** — lowest is `--logo` on light `--bg` at 4.64:1.
Nothing to renegotiate. `--border` is 1.29:1 but it's a decorative hairline,
not text or a control boundary.

### Deviation: `tailwind.config.ts` does not exist

`create-next-app` installs **Tailwind v4**, which is CSS-first — there is no
config file, `@theme` in `globals.css` is the config. All tokens (colours, type
scale, tracking, radii, fonts) are mapped there instead. Say the word if you'd
rather I pin Tailwind v3 to get a literal `tailwind.config.ts`.

---

## 2. Section order, with copy + image slots

Document order as the design has it. `→` marks what I'd populate it with.

| # | Section | ID | Copy slots | Image slots |
|---|---|---|---|---|
| 0 | Header | — | Wordmark `SOJIB_ANALYTICS`; nav SERVICES / WORK / REVIEWS / ABOUT / BLOG; theme toggle; "BOOK A 30-MIN CALL" | — |
| 0b | Mobile menu | `sf-mobile-menu` | Same 5 links + CTA + theme toggle + "CLOSE ✕" | — |
| 1 | Hero | — | Eyebrow `■ TRACKING INTEGRITY`; h1 "If the data is **wrong**, every decision after it is a guess."; 1 lead para; 2 CTAs; 2 social proof chips | `hero-dark.jpg` + `hero-light.jpg` (real, extracted) |
| 2 | Stat band | — | 4 stat + label pairs | — |
| 3 | Stack strip | — | "STACK /" + 14 tool logos (inline SVG in design) | 14 inline SVGs — reused as-is |
| 4 | Symptoms | — | Eyebrow `01 / DIAGNOSTIC`; h2 "Does this look familiar?"; 4 cards (tag, headline, 1 para) | — |
| 5 | Services | `services` | Eyebrow `02 / SERVICES`; h2 "Four ways in"; **4** cards (code, duration, price, title, para, 3 bullets); footnote | — |
| 6 | Work | `work` | Eyebrow `03 / CASE FILES`; h2 "Fixed, and provable"; 2 case cards (before/after bar + 4 metrics + 4 tags); 6-row archive table | `pf-1`, `pf-2` — **both empty** |
| 7 | Reviews | `reviews` | Eyebrow `04 / REVIEWS`; h2 "Clients on the record"; 3-slide video carousel; 8-slide written-review carousel | `rev-video-1/2/3` — **empty**, these are your 3 YouTube testimonials |
| 8 | Process | `process` | Eyebrow `05 / METHOD`; h2 "How the work runs"; 4 steps (Measure / Diagnose / Rebuild / Reconcile) | — |
| 9 | About | `about` | Eyebrow `06 / ABOUT`; h2 "I only do measurement."; 1 para; doc link; 3 credential chips; 1 pull-quote | — |
| 10 | Notes / blog | `blog` | Eyebrow `07 / NOTES`; h2 "Writing"; 3 article cards | — |
| 11 | Contact | `contact` | Eyebrow `08 / CONTACT`; h2; 1 para; CTA; email; 2 social links | — |
| 12 | Footer | — | Tagline; 5 social icons; 4 nav links | — |

### Sections the brief requires that the design does **not** have

| Needed | Plan |
|---|---|
| **FAQ** (5–6 Q&A + `FAQPage` JSON-LD) | Build in the design's language — reuse the Symptoms card grid, eyebrow `09 / FAQ`, insert **between Process and Contact** |
| **Inline Calendly embed** | Insert into `#contact`. Design's contact CTA is a bare `mailto:` — I'll keep the email link and add the embed above it |
| **Calendly popup** | Wire to header CTA, mobile-menu CTA, hero primary CTA, contact CTA |

---

## 3. Conflict register — decisions I need

The design was built with placeholder narrative content. Rule 8 says never
invent client names, case-study numbers or testimonials, so I can't ship most of
what's in these slots. Nine items:

### A. Stat band — invented numbers

Design says `40+ TRACKING AUDITS` · `+31 pts MEDIAN ACCURACY GAIN` ·
`12 SERVER-SIDE BUILDS` · `7 yrs IN MEASUREMENT ONLY`. None are verifiable.

**→ My plan:** swap to your four verified Upwork stats — `97% JOB SUCCESS` ·
`4.9★ 26 REVIEWS` · `51 JOBS COMPLETED` · `384 HOURS WORKED`, with the
"as of Upwork profile" note and a link to your profile. Same 4-up layout.
*Confirm, or give me real numbers for the design's framing.*

### B. Case files — two fabricated case studies ⚠️ biggest one

`CASE_007 / SHOPIFY / UK / SKINCARE` with 61%→98% accuracy, 0 duplicates,
7.2/10 match quality, 14 days. `CASE_011 / DTC COFFEE / DE` with 4.1x claimed
→ 2.4x verified ROAS, 54% events deduplicated, £31k reallocated. Plus a
6-row archive (Nordic supplements, AU fashion marketplace, US subscription box,
B2B SaaS £40k MRR, AU furniture, UK coffee) each with a result figure.

All invented. I can't publish any of it.

**→ DECIDED (Sojib: no preference → my call): option 2, capability cards.**
Same visual treatment — before/after bar, metric grid, tag row, archive table —
but framed as *what each class of fix does* rather than *what I did for client
X*. No client names, no invented figures. Section keeps its weight and nothing
blocks on sourcing numbers.

Options considered:
1. **Real anonymised numbers** for 1–2 engagements ("UK Shopify skincare brand,
   purchase accuracy 61%→98%") — section stays exactly as designed. Strongest
   outcome, but needs data I don't have.
2. **Capability cards** ← chosen.
3. **Cut `#work`** entirely, drop WORK from nav, repoint hero's secondary CTA.

*Still open:* send real anonymised figures any time and I'll swap them into the
same structure — it's a content change, not a rebuild.

### C. Video reviews — invented names on your real videos

Design attributes the 3 video slides to "Hannah Reid · Founder, skincare brand
· UK", "Marcus Feld · Head of Growth · DE", "Priya Nair · Agency owner · US",
each with a pull-quote.

Your 3 YouTube videos are real; these names and quotes are not.

**→ My plan:** keep the 3 slides and the carousel, fill the slots with the real
YouTube thumbnails (lite facade per brief), drop the invented names/quotes.
Label them "Client video review 1/2/3" until you send real attributions.
*Send me names + roles if the clients agreed to be named — much better.*

### D. Written reviews — 3 invented + 5 literal `LOREM`

Cards 4–8 are `LOREM — replace with review 5…`. Cards 1–3 reuse the invented
names from C.

**→ My plan:** **cut the written-review carousel**, keep the video carousel.
The section still works — h2 "Clients on the record" over 3 video reviews.
*Alternative: paste 3–8 real quotes from your Upwork reviews (you have 26) and
I'll wire them in with "via Upwork" attribution.*

### E. Service pricing — invented

`from $850` / `from $2,400` / `from $1,600` / `from $900/mo`, plus durations
(5–7 days, 2–3 weeks, 1–2 weeks, ongoing) and the footnote "Fixed price agreed
before any work starts — no hourly billing".

The only rate you gave me is **$30/hr on Upwork**, which contradicts the
"no hourly billing" footnote.

**→ Default if you don't answer:** drop the price line and the footnote, keep
the duration estimates, and let the FAQ's "How do you charge?" carry it.
*Or confirm real package prices and I'll use them verbatim.*

### F. Blog section vs. "don't add a blog"

Design has `#blog` (`07 / NOTES`) with 3 article cards linking to `#blog`
(dead self-links) — and BLOG sits in both nav menus and the footer.

**→ My plan:** **remove the section and all 4 nav references.** Brief rule wins
over design here; three cards linking nowhere is worse than no section.
*Say so if you want it kept as a "writing coming soon" block instead.*

### G. Services: design has 4 cards, brief lists 6 topics

Design: Tracking audit / Server-side tagging / Ad platform parity / Reporting.
Brief: GA4 audit / GTM / server-side GTM / Meta CAPI + Enhanced Conversions /
ecommerce tracking / Looker Studio.

**→ My plan:** keep the design's **4-card grid** (it's the layout of record) and
fold all 6 briefed topics in — GA4 + GTM into "Tracking audit", ecommerce into
"Server-side tagging", CAPI + Enhanced Conversions into "Ad platform parity",
Looker into "Reporting". Nothing from the brief gets lost.
*Alternative: extend to a 6-card grid. Costs some of the design's composure.*

### H. Wrong contact details in the design

| Design | Real |
|---|---|
| `hello@analyticssojib.com` | `sojibh2001@gmail.com` |
| `upwork.com/freelancers/analyticssojib` | `.../conversiontrackinggtmga4looker` |
| `UPWORK · TOP RATED · 4.9★ · 60 JOBS` | 51 jobs, 26 reviews |
| `docs.google.com/document/d/tracking-plan-sample` (About) | — no real doc |

**→ My plan:** use the real values everywhere. The design's footer/socials are
missing GitHub — I'll add it to the footer row (brief lists 6 socials, design
has 5). For the fake Google Doc link I'll **remove the "READ A REAL TRACKING
PLAN" button** unless you have a public doc to point at.

*Worth noting: `sojibh2001@gmail.com` on a site selling data rigour reads
weaker than `hello@analyticssojib.com`. You own the domain — if you set up the
mailbox I'll use it and the design needs no change here.*

### I. About section — unverified claims

"Seven years on tracking alone", the `GA4 CERTIFIED` chip, and a pull-quote
("reporting revenue 39% light… three agencies missed it") attributed to
`HEAD OF ECOMMERCE · UK SKINCARE BRAND (CASE_007)`.

**→ My plan:** drop the pull-quote (invented). Keep the chips
`MEASUREMENT SPECIALIST · NOT A GENERALIST` and `REMOTE · UTC+6` (both true).
*Confirm the years-of-experience figure and whether you hold a current GA4
certification — I'll use whatever you tell me, or omit both.*

---

## 4. Behaviour to port from `support.js`

Design state I'll reimplement as React, honouring `prefers-reduced-motion`:

- `theme` / `themeLabel` / `toggleTheme` — dark ⇄ light, persisted to
  `localStorage`, applied pre-paint to avoid a flash
- `menuOpen` / `burgerGlyph` / `closeMenu` — mobile menu, focus trap + Esc
- `vidGo0..2` / `vidDot0..2` / `vidPrev` / `vidNext` / `vidCount` — video
  carousel with dots and arrows
- `wGo0..7` / `wScroll` / `wKey` — written-review carousel (**dropped**, per D)
- `showHamburger` / `showDesktopNav` / `showBarCta` — responsive header
- `heroMinH` / `heroImgPos` / `heroDarkOpacity` / `heroH1Size` — hero
  responsive geometry; becomes CSS clamp + media queries

Framer Motion isn't needed — the design's motion is CSS transitions and scroll
snap. That keeps the bundle down. I'll skip it unless you want more.

---

## 5. What I'll do after your "go"

Sections in design order → FAQ + Calendly → GTM placeholder (renders nothing
without `NEXT_PUBLIC_GTM_ID`) → `lib/gtm.ts` (defined, never called) → SEO,
JSON-LD, OG image, favicons, sitemap/robots → responsive pass at 360/390/768/
1024/1280/1440/1920 → Lighthouse → GitHub `sojibanalyst/analyticssojib` →
Vercel → read the real DNS records from Vercel → show you Hostinger's current
records **before** touching them → apply → verify SSL → final report.

All copy, links, stats and testimonials land in `content/site.ts` as typed
objects, editable without touching JSX.

---

## 5b. Resolved since the checkpoint (Sojib, 5 Aug 2026)

| Item | Resolution |
|---|---|
| Video review 1 | **Mayar Hammour · Maitea** |
| Video review 2 | **Peter Mai · Profibeauty.cz** |
| Video review 3 | Client name not available. Titled **"Looker Studio problem solved"** — subject only, no claim about what was said |
| Years of experience | **2 years** — now in the About copy |
| GA4 certification | **Confirmed held** — `GA4 CERTIFIED` chip restored |
| Service durations | 5–7 days confirmed for the audit; the other three left as written |
| Before/after figures | **60% → 95%** and **30% → 90%**, supplied as representative of Sojib's own work |

### On the before/after figures — read this before editing them

Sojib supplied these as the kind of improvement his work produces, not as
audited results from one named engagement. They are therefore rendered as
**typical ranges**, with:

- captions ending `· TYPICAL REBUILD` / `· TYPICAL SERVER-SIDE MIGRATION`
- a footnote under the cards stating plainly that they are typical ranges and
  not audited results from a single client
- **no** client name, country or industry attached to any figure

That keeps them honest: a specialist stating what his work typically achieves.
Turning them into `CASE_007 / SHOPIFY / UK` style claims would need real
per-engagement numbers, which still do not exist. Do not relabel them.

### Still not done

- **Quotes from the videos.** Sojib asked for the panels to reflect what each
  client says. I cannot watch or listen to video, so no quote is transcribed.
  Anything written there would have been invented. Send the wording and it goes
  straight into `content/site.ts`.

## 6. The short version — what I need from you

1. **B (case files)** — real numbers, capability cards, or cut? *Blocking.*
2. **A, C, D, E, F, G, H, I** — my defaults are above; say "defaults" and I'll
   run them all as written.
3. Optional: real client names for the videos, real Upwork review quotes, a
   `hello@` mailbox, years of experience, GA4 cert status.

Answer 1 and say "defaults" for the rest and I'll build straight through to
deploy.
