# PLAN.md: analyticssojib.com redesign 2026

Written from a read of `sojibanalyst/analyticssojib` at `main` (`bdded12`) over the GitHub API.
Nothing in the repo has been changed yet.

## 0. Blocker before Phase 1: this machine has no working copy

- No local clone of the repo was found on C:, D:, E: or the user profile.
- `git` and `node` are not installed (not on PATH, not in the usual install folders).

So I cannot run `npm run dev`, check localhost, run Lighthouse or commit locally yet. Two ways forward:

| Option | What it needs from you | Trade-off |
|---|---|---|
| **A. Local setup (recommended)** | OK to install Git and Node LTS (winget), a folder to clone into, and a `.env.local` with the Supabase URL + anon key | Matches the workflow you asked for: dev server, browser checks, Lighthouse, commit per phase |
| B. GitHub-only | Nothing | I commit to `redesign-2026` through the API and we review on Vercel preview deployments. No localhost, no local Lighthouse, slower loop, and I cannot run the typecheck/lint/tests before pushing |

## 1. What exists

**Stack.** Next.js 16.2.12 (App Router, React 19, Turbopack), TypeScript strict, Tailwind v4 (CSS-first `@theme`, no config file), Supabase (`@supabase/ssr`), Vercel. Zero UI or animation libraries. `proxy.ts` replaces `middleware.ts` (Next 16 rename). `AGENTS.md` says to read `node_modules/next/dist/docs/` before writing code, because this Next version differs from older conventions; I will.

**Routes.**
- `app/(marketing)/`: `/`, `/blog/*`, `/book`, `/case-studies/[slug]`, `/privacy`, `/terms`, `/tracking-plan`. Shared chrome in `(marketing)/layout.tsx`: ScrollProgress, AnnouncementBar, Header, Footer, Tracker, Motion, Parallax, CaseScroll, ContactDock, JSON-LD.
- `app/(admin)/admin/`: login plus console (case-studies, reviews, faqs, posts, events, sessions, event-map, destinations, leads, offline-conversions, settings). Own `admin.css` that aliases the tokens in `globals.css`.
- `app/api/collect` (collector) and `app/api/calendly` (webhook).

**Homepage** (`app/(marketing)/page.tsx`, static with `revalidate = 3600`): Hero, StatBand, StackStrip, Symptoms, Services, Work, Reviews, Process, About, Notes, Faq, Contact.

**Content split.**
- Supabase, read at build time through `lib/content` (anon client, cached GETs): `case_studies` (+ `case_study_stats`, `case_study_shots`), `reviews` (video + written), `faqs`, `posts`.
- `content/site.ts` (still live): identity, nav, hero, proof stats, client row, stack strip, symptoms, services and prices, process, about, contact copy.
- The case/review/FAQ arrays in `content/site.ts` are import input only. Editing them changes nothing on the site.

**Styling.** All colours are custom properties in `app/globals.css`, one block per theme. `components.css` (64 KB) holds marketing components, many sections also use inline styles. Fonts: Geist + Geist Mono via `app/fonts.ts`, shared with the admin. Light is currently the default theme (`lib/theme.ts`, localStorage key `sf-theme-2`, pre-paint bootstrap in `app/layout.tsx`).

**Motion today.** Hand-rolled, no dependencies: `Motion.tsx` (scroll reveal, stagger, exits early on reduced motion), `lib/in-view.ts`, `Parallax.tsx`, `CaseScroll.tsx`, `ScrollProgress.tsx`, `StatValue.tsx` (count-up), `ScrambleValue.tsx`, `BeforeAfter.tsx` bars.

**Tracking today.**
- `lib/track.ts`: one `event_id` per event, pushed to the dataLayer and beaconed to `/api/collect` with the same id. Already what Phase 8 asks for.
- `components/Tracker.tsx` fires `page_view` on route change.
- `lib/consent.ts` + `consentBootstrap` in `app/layout.tsx`: Consent Mode v2 defaults (all denied except security) declared above GTM. The banner was removed on purpose; every event is stored as `{"status":"not_asked"}`. `docs/consent-re-enable.md` is the documented path to put a banner back.
- `components/GoogleTagManager.tsx`: container id read at request time from the `public_site_settings` view (set in /admin/settings), env `NEXT_PUBLIC_GTM_ID` as fallback. Loads from `www.googletagmanager.com`.
- Collector: service-role insert into `events`, session only when `analytics_storage === "granted"`, always answers 204. `events` and `sessions` are not readable by anon.

## 2. Where your brief and the repo disagree

These are the things I will not guess at. Defaults are what I do if you just say "defaults".

| # | Brief says | Repo says | Default |
|---|---|---|---|
| 1 | Dark is the default theme | `AGENTS.md`: light is the default, key `sf-theme-2` | Follow the brief. Bump the key to `sf-theme-3` so visitors with a stored "light" land on the new default once, flip the bootstrap, `useTheme` server snapshot, `theme-color`, and update `AGENTS.md` |
| 2 | Add Lenis, GSAP + ScrollTrigger, Framer Motion | "Ask before adding a dependency", and a 60 KB gz budget | GSAP core + ScrollTrigger are roughly 40 to 45 KB gz, Lenis about 5, Motion 20 to 34 depending on import style. All three together will not fit in 60. **Recommend: GSAP + ScrollTrigger (lazy loaded below the hero) + Lenis, and no Framer Motion.** Component enter/hover stays CSS plus the existing `Motion.tsx`. I will report measured sizes from the build |
| 3 | One branch `redesign-2026`, commit per phase | "Never commit to main. One branch and one PR per phase" | Follow the brief: one branch, one commit per phase, one PR at the end, never merged by me |
| 4 | Do not change the admin | Admin shares `fonts.ts` and every colour token with the public site | Admin behaviour is untouched. Its look would follow the new tokens and fonts unless pinned. **Default: pin the admin to its current palette and Geist** by scoping the old values under `.admin`, so the console looks exactly as it does today |
| 5 | Token names `--text-muted`, `--accent-2`, `--danger` | Existing names `--muted`, `--faint`, `--ink`, `--ok`, `--warn`, used in hundreds of places | Keep existing names, change their values to your palette, add `--accent-2` and `--danger`. No mass rename |
| 6 | Light toggle keeps working | Brief only defines dark colours | I derive the light palette from the same hues. `#34E89E` fails AA as text on white, so light keeps a darker green for text and uses the bright green only as a fill, as the site does now |
| 7 | "Live events" public endpoint | `AGENTS.md`: the service-role client is for the collector and fan-out worker only; public pages must stay static | Panel is a client component that fetches the endpoint after load, so the homepage stays static. For the read I propose a **migration**: a view exposing only `event_name`, `page_path` (query string stripped) and `occurred_at` for the latest N public-page events, granted to anon. Same pattern as `public_site_settings`. Needs your OK (see section 4) |
| 8 | `data-track` attributes | `[data-track]` is already a CSS hook for carousel tracks (`globals.css`) | Use `data-track-event` (plus `data-track-*` params) to avoid the collision |
| 9 | GTM through the sGTM domain via `NEXT_PUBLIC_SGTM_URL` | Settings table already has `sgtm_endpoint`, but the public view exposes only the container id | Use the env var as you specified. Also update the CSP in `next.config.ts` / `docs/security-headers.md` for the new script origin |
| 10 | Consent banner back | Removed on purpose in PR #18 | Rebuild following `docs/consent-re-enable.md`: reject as easy as accept, nothing set until a button is pressed, wired to the existing `setConsent()`. No collector change needed |
| 11 | Stats in one config or DB row | `proof` in `content/site.ts`, plus "53 projects" typed into the About copy | **Default: one `proof` object in `content/site.ts`**, every mention derived from it. A DB row would need a migration and a new admin form field, which touches the admin |

## 3. Phases and files

Every phase ends with: typecheck, lint, tests, `check:routes`, a browser pass at 375 / 768 / 1280 / 1536 in both themes and with reduced motion, then one commit.

**Phase 1: design system + motion stack**
- `app/globals.css` (token values, dark-first block order, 1200px measure, spacing, radius, dot grid), `app/fonts.ts` (Space Grotesk, Inter, JetBrains Mono through `next/font`), `app/layout.tsx` (theme default, theme-color), `lib/theme.ts`, `app/components.css`, `app/admin.css` (pin, see row 4).
- New: `components/ui/Button.tsx`, `EventChip.tsx`, `StatCard.tsx`, `CaseCard.tsx`, `ReviewCard.tsx`; restyle `SectionHeading.tsx`.
- New: `components/SmoothScroll.tsx` (Lenis, off under reduced motion), `lib/motion.ts` (shared easing, durations, lazy GSAP loader).
- `app/opengraph-image.tsx` and the Geist `.ttf` files it reads: swapped to the new heading face.
- `package.json` (dependencies, after your OK).

**Phase 2: hero**
- `components/sections/Hero.tsx` rewritten; new `components/hero/PipelineSvg.tsx` (inline SVG, CSS/GSAP particles, static full drawing under reduced motion, parallax on pointer-fine devices only).
- Avatar slot: `public/avatar.jpg` with a single constant, so the new photo is a file swap. Large photo moves to `About.tsx`.
- `StatBand.tsx` becomes the trust bar. Headline, lead and both CTAs unchanged.
- The sGTM node label needs your real subdomain (question 8).

**Phase 3: problem section**
- `components/sections/Symptoms.tsx` + new `components/symptoms/MismatchDashboard.tsx`. ScrollTrigger pin on desktop, sequential reveal on mobile, static reconciled state under reduced motion.
- The dashboard figures are illustrative, so the panel gets a small "Example data" label. The four cards keep their copy.

**Phase 4: services**
- `components/sections/Services.tsx`, new `components/services/EventStream.tsx`, event lists added to `content/site.ts`.
- Remove `proof.rate` (`$30/hr`) from `content/site.ts`. The FAQ sentence lives in the `faqs` table, so that is a data edit, not a code edit (question 5).

**Phase 5: case studies**
- `components/sections/Work.tsx`, `BeforeAfter.tsx`, `CaseGallery.tsx`, `app/(marketing)/case-studies/[slug]/page.tsx`, `StatValue.tsx`.
- **No migration needed for the case layout.** `case_studies` already has summary (`body`), `tags`, the before/after metric columns, stats and screenshots, and the admin form already edits them. Layout will handle 2 to 6 cases.
- "More work" grid: new table, see section 4.
- CASE_011 is not edited until you answer question 4.

**Phase 6: reviews**
- `components/sections/Reviews.tsx`, `WrittenReviews.tsx`, `LiteYouTube.tsx` (already a click-to-load facade, restyle only), new `components/reviews/Marquee.tsx`, `ReviewStack.tsx`, `ReviewGrid.tsx`.
- `lib/content/index.ts`: also select `rating` and `source` (columns already exist) for the stars and the "Verified on Upwork" mark.
- Stats moved to the single `proof` object: 100% Job Success, Top Rated, 54 jobs, 29 reviews, 5.0.
- Placeholder reviews (`is_placeholder`) are never rendered as real quotes; that rule stays.

**Phase 7: signature features**
- 7.1 `app/api/events/recent/route.ts` (returns `event_name`, `page_path`, `occurred_at` only; `s-maxage=10`; per-IP limit) + `components/LiveEvents.tsx` near About.
- 7.2 `components/TrackingDrawer.tsx` + a small in-memory log inside `lib/track.ts` + plain-English descriptions in `content/site.ts`.
- 7.3 optional `app/api/tracking-check/route.ts` with SSRF guards (http/https only, DNS resolve then block private, loopback, link-local and metadata ranges, no redirects to private hosts, 5 s timeout, 1 MB cap). Built last, only if the rest is solid.
- New routes added to `scripts/check-routes.mjs`.

**Phase 8: tracking**
- New `components/ConsentBanner.tsx`, rendered in `(marketing)/layout.tsx` only. `app/layout.tsx` consent defaults get the region logic you choose.
- `components/GoogleTagManager.tsx`: load `gtm.js` from `NEXT_PUBLIC_SGTM_URL` when set. `.env.example` updated (names only).
- `lib/track.ts`: admin-session check (skip all sends when a Supabase auth cookie is present), delegated `data-track-event` click listener, scroll depth, typed event names. `lib/gtm.ts` unchanged in behaviour.
- `TRACKING_PLAN.md` at the repo root, kept consistent with the existing public `/tracking-plan` page and the console's event map.

**Phase 9: SEO and polish**
- `app/robots.ts` (disallow `/admin`, `/api`), `app/layout.tsx` (title and OG/Twitter without em dashes), `app/(admin)/layout.tsx` (title "Console | Sojib H.", no canonical, no OG).
- Em dash sweep over code and database content. Brand name unified per your answer. `CLAUDE` and `CHATGPT` removed from `stack` in `content/site.ts`.
- Lighthouse mobile for `/` and one case study page, screenshots, acceptance checklist.

## 4. Migrations I would need (none written or applied yet)

1. **`portfolio_items`** (Phase 5): `title`, `url`, `sort_order`, `published`, RLS with anon read of published rows, seeded with your nine titles, all pointing at the Upwork profile URL. Managing them afterwards needs a small console screen, which is an admin addition. Alternative with no admin change: you edit them in the Supabase table editor.
2. **`public_recent_events` view** (Phase 7.1): three columns, public pages only, latest 20, granted to anon. Alternative with no migration: the endpoint uses the service-role client, which `AGENTS.md` currently forbids outside the collector.
3. Optional **stats in the DB** (row 11) if you prefer that over the config object.

Each one will be a separate timestamped file in `supabase/migrations/`, shown to you before it runs, followed by a regenerated `lib/supabase/types.ts`.

## 5. Risks

- **Static rendering.** Every public page must stay `○`/`●` in the build output. Live panel, drawer and banner are all client-side for that reason. Region-based consent cannot be decided at render time on a static page; it has to come from Google's `region` parameter on the consent defaults plus a country hint for the collector (Vercel's `x-vercel-ip-country`, already read in the collector).
- **LCP moves** from the hero photo to the headline/SVG once the photo leaves the hero. Good for the 2.5 s target, but the SVG must be inline and the fonts preloaded or CLS suffers. Three font families instead of two adds weight; I will subset and limit weights.
- **Lenis vs existing behaviour.** `html { scroll-behavior: smooth }`, the anchor offsets, the mobile menu focus trap, the Calendly popup and `lib/in-view.ts` all assume native scrolling. Each needs a check once Lenis is in.
- **ScrollTrigger pinning** is the usual source of CLS and mobile jank. Desktop only, with reserved height.
- **Live events panel privacy.** `page_path` is stored with its query string (`location.pathname + location.search`), so it can contain UTM values, click ids or anything else in a URL. The public read must strip everything after `?` and exclude non-public paths.
- **GA4 double counting.** GA4 does not deduplicate on `event_id` (Meta and TikTok do). New events must reach GA4 from the browser or the server, not both. `lib/forwarding/ga4.ts` already enforces this for one event; the tracking plan will state the destination per event.
- **Consent.** Putting a real container id live with EEA/UK traffic before the banner ships would set cookies without a lawful basis. Phase 8 ships banner and GTM together.
- **Rate limiting on serverless** has no shared memory. The 10 s CDN cache does most of the work; the per-IP limit is best effort unless you want it backed by a table.
- **Snapshot harness.** `npm run diff:pages` will show diffs on every redesigned page by design. I will use it to prove `/privacy`, `/terms` and `/blog/*` only changed in the shared chrome.
- **Content honesty rules** in `AGENTS.md` (no invented names, numbers or quotes) stay in force. Anything illustrative is labelled as an example.
- **CASE_007** is still flagged `needs_confirmation`, which is why the "every figure was reconciled" note is currently hidden on the homepage. Tell me if those figures are confirmed.

## 6. Questions

1. **Setup:** option A or B from section 0? For A: OK to install Git and Node, and which folder?
2. **Dependencies:** OK to add `gsap` and `lenis`, and to skip Framer Motion to stay inside 60 KB?
3. **Admin look:** pin the console to its current colours and fonts (default), or let it follow the new design system?
4. **CASE_011:** is the true figure **1.9x** (the headline, "The P&L said 1.9x") or **2.4x** (the VERIFIED stat)?
5. **FAQ "$30/hr":** it is a row in Supabase. Shall I update that row, or will you edit it in /admin/faqs? Proposed answer: "All work is scoped as a fixed price agreed before it starts, so you know the number up front. You get the scope in writing first, and I will tell you if I think you do not need the work."
6. **Migrations** in section 4: OK for 1 and 2? Stats in config (default) or DB?
7. **Consent regions:** (a) banner and default-denied for everyone, simplest and safest, or (b) default-denied in EEA + UK + Switzerland and granted elsewhere without a banner, or (c) banner everywhere, denied by default in EEA/UK/CH and granted by default elsewhere until the visitor chooses?
8. **GTM:** the web container id and the sGTM domain (also used as the label on the hero's server node).
9. **Brand name:** `SOJIB_ANALYTICS`, `ANALYTICS_SOJIB` / analyticssojib, or "Sojib H."?
10. **En dashes:** ranges like "5–7 DAYS" use the short en dash, not the em dash. Leave them, or change to "5 to 7 days"?
