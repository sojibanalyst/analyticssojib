# analyticssojib.com

Personal site for **Sojib H.** — a web analytics and tracking specialist
(GA4, Google Tag Manager, server-side tagging, Meta CAPI, Google Ads enhanced
conversions).

Single page, no CMS, no database. Booking runs through Calendly.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) + a small component layer |
| Fonts | `next/font/google` — JetBrains Mono + Archivo, self-hosted |
| Booking | Calendly (inline embed + popup), loaded lazily |
| Analytics | Google Tag Manager placeholder — inert until an ID is set |
| Hosting | Vercel |

No UI component library and no animation library: the design's motion is CSS
transitions and scroll-snap, so nothing extra was needed.

## Local development

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Production build:

```bash
npm run build
```

Type-check and lint (`next lint` was removed in Next 16, so ESLint runs
directly):

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_GTM_ID` | No | Google Tag Manager container ID, e.g. `GTM-XXXXXXX` |

If `NEXT_PUBLIC_GTM_ID` is absent or empty the site renders **no** GTM script
and **no** `<noscript>` iframe — nothing is injected and nothing is logged.

`.env.local` is gitignored. Never commit real IDs or secrets.

### Adding the GTM container later

1. Add `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` to `.env.local` for local work.
2. In Vercel → Project → Settings → Environment Variables, add the same key and
   value for Production (and Preview, if you want it there too).
3. Redeploy. `NEXT_PUBLIC_*` values are inlined at build time, so an existing
   deployment will not pick the value up without a rebuild.
4. Verify with GTM Preview, or check that `window.dataLayer` exists in the
   console.

Events are **not** wired up yet. `lib/gtm.ts` exports a typed `pushEvent(name,
params)` helper that safely no-ops when the dataLayer is missing; it is
deliberately never called. Wire real events there once the tracking plan is
agreed.

## Project layout

```
app/
  layout.tsx           metadata, fonts, theme bootstrap, JSON-LD, GTM
  page.tsx             composes the sections in design order
  globals.css          design tokens + Tailwind @theme mapping
  components.css       repeated component patterns from the design
  opengraph-image.tsx  1200x630 OG image via next/og
  manifest.ts, robots.ts, sitemap.ts, not-found.tsx
components/
  sections/            Hero, StatBand, StackStrip, Symptoms, Services, Work,
                       Reviews, Process, About, Faq, Contact, Footer
  ui/                  SectionHeading, Icon, icons (from the design's SVGs)
  Header, LiteYouTube, CalendlyInline, CalendlyPopupButton, GoogleTagManager
content/
  site.ts              ALL copy, links, stats and testimonials
lib/
  gtm.ts, calendly.ts, theme.ts, jsonld.ts
```

**Every string, stat, link and testimonial lives in `content/site.ts`.**
Components read from it, so copy can be edited in one file without touching
JSX.

## Design

The visual design is a Claude Design project; `DESIGN-NOTES.md` records the
section inventory, the tokens that were extracted, and — importantly — every
place where the design's placeholder content was replaced or removed because it
could not be substantiated. Read it before changing content.

Themes: dark is the default, with a light theme via `data-theme="light"` on the
root element, persisted to `localStorage` and applied before first paint.

## Accessibility and performance notes

- One `<h1>`, logical heading order, `<section aria-labelledby>` throughout.
- Skip-to-content link, visible focus rings, keyboard-operable carousel and
  mobile menu (focus trap + Escape).
- Every text colour token clears 4.5:1 in both themes.
- `prefers-reduced-motion` is honoured for every transition.
- Testimonial videos are lite facades: no YouTube JavaScript, no iframe and no
  cookies until the user clicks play.
- Calendly is not in the initial bundle; an IntersectionObserver arms it as the
  contact section approaches.

## Deploy

Deployed on Vercel from `main`. `analyticssojib.com` is the canonical host;
`www.analyticssojib.com` redirects to it. DNS is managed at Hostinger.

## Licence

All rights reserved. The photography and written content are not licensed for
reuse.
