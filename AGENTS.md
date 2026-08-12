<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules

## Structure

```
app/
  layout.tsx            root: <html>, fonts, theme bootstrap, GTM
  globals.css           the ONLY place a colour is defined
  components.css        marketing components
  tracking-plan.css     /tracking-plan only
  admin.css             /admin only — aliases globals.css, zero hexes
  (marketing)/          the public site
  (admin)/              the console
proxy.ts                was middleware.ts; Next 16 renamed the convention
```

Route groups never appear in a URL. `scripts/check-routes.mjs` proves it, and
runs in CI.

## Hard rules

- **Not one public URL may change.** Add to `scripts/check-routes.mjs` when a
  route is added; never edit an existing entry to make a failure go away.
- **One token source.** Every colour is a custom property in `app/globals.css`,
  defined in both the `:root, [data-theme="light"]` block and the
  `[data-theme="dark"]` block. The dark block must stay second — equal
  specificity means source order decides. `admin.css` aliases those tokens and
  contains no hex values.
- **One theme mechanism.** `lib/theme.ts`, `data-theme` on `<html>`,
  localStorage key `sf-theme-2`. Light is the default.
- **One font setup.** `app/fonts.ts`. The variables belong on `<html>`, because
  Tailwind's `@theme` resolves them at `:root`.
- **Public pages stay static.** No `force-dynamic` on a public route, and no
  per-request database call to render one. Check the build output: everything
  under `(marketing)` must print `○` or `●`, never `ƒ`.
- **Secrets never enter the repo.** `.env.example` carries names and comments
  only. `SUPABASE_SERVICE_ROLE_KEY` is never prefixed `NEXT_PUBLIC_` and never
  imported into a client component; `npm run check:secrets` fails the build if
  it reaches `.next/static`.
- **Ask before adding a dependency.**
- **Never commit to `main`.** One branch and one PR per phase. Do not merge.

## Supabase

- Migrations are forward-only, timestamp-prefixed, in `supabase/migrations/`.
  **Never edit one that has run** — add another.
- Regenerate `lib/supabase/types.ts` after every migration. It is generated;
  do not hand-edit it.
- Every table has RLS enabled. `anon` may read published content and nothing
  else. Writes go through a Server Action or a Route Handler — never from a
  client component.
- `getAdminClient()` (service role) is for the collector and the fan-out worker
  only. Reaching for it to get around a policy is a bug, not a shortcut.
- Auth checks use `getUser()`, never `getSession()`: the session cookie is
  forgeable, and only `getUser()` revalidates it.

## Content

Never invent client names, logos, case-study numbers, testimonials or
credentials. If a slot needs content that has not been supplied, use a clearly
labelled placeholder and say so in the PR.

## Commands

```
npm run dev            next dev
npm run build          next build
npm run typecheck      tsc --noEmit
npm run lint           eslint
npm run check:secrets  scan .next/static for server-only secrets (after build)
npm run check:routes   route parity against a running server
npm run seed           idempotent seed, reads .env.local
```
