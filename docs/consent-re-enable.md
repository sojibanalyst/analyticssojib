# Turning consent back on

The banner was removed deliberately (PR #18). The **state** it wrote was kept —
`lib/consent.ts`, the `sf_consent_1` cookie, the Consent Mode v2 defaults, and
the `consent` column on `events` and `sessions` — so putting a consent
interface back is wiring, not a rebuild.

**Read this before pasting a GTM container ID in if the site will see UK or EU
traffic.** With no consent interface, a container that sets analytics cookies is
setting them without a lawful basis under the UK/EU ePrivacy rules. The GTM
field and this document are independent switches; nothing stops you turning the
container on first, and nothing warns you either.

## How long it takes

**Half a day, not ten minutes.** Two of the four steps below are real work: a
banner is a UI component with legal constraints on how it behaves, and the
"reject" path has to be exactly as easy as "accept". If you were hoping to flip
one flag, that is not the shape of this.

## What already exists — do not rebuild these

| Piece | Where | State |
|---|---|---|
| Consent Mode v2 defaults | `app/layout.tsx`, `consentBootstrap` | Declared **above** the GTM snippet, all denied except `security_storage`, `wait_for_update: 500` |
| Cookie read/write | `lib/consent.ts` → `readConsent()` / `setConsent()` | Working. `setConsent()` does the cookie, the `gtag('consent','update')` and the dataLayer event in one call |
| Per-event record | `lib/track.ts` → `currentConsent()` | Stamps every event. Writes `{"status":"not_asked"}` today; switches to real answers the moment the cookie exists |
| Storage | `events.consent`, `sessions.consent` (jsonb) | Default `{"status":"not_asked"}` |
| Console display | `/admin/events` | Renders three states: Granted / Denied / Not asked |
| Session gate | `app/api/collect/route.ts` | Requires `analytics_storage === "granted"` before creating a session id |
| Event map entry | `consent_update`, seeded | Documented and dormant — reads "Documented" until something fires it |

## The four steps

### 1. Build the banner component — the real work

There is no component to restore; it was deleted, not commented out. `git show
2d6a6a7^:components/ConsentBanner.tsx` prints the old one if you want the
starting point, along with `git show 2d6a6a7^:content/site.ts` for the copy
(`export const consent`) and the `.consent*` block in
`git show 2d6a6a7^:app/components.css`.

Two rules it must keep, both legal rather than aesthetic:

- **Refusing is exactly as easy as accepting.** Same size, same weight, same
  row. No greyed-out reject, no extra click to find it.
- **Nothing is set until a button is pressed.** Dismissing is not consent, so
  there is no dismiss button.

It must also render nothing until the client has read the cookie, or it flashes
at everyone who already answered.

### 2. Point it at `setConsent`

```tsx
import { DENIED, GRANTED, setConsent } from "@/lib/consent";

<button onClick={() => setConsent(DENIED)}>{copy.reject}</button>
<button onClick={() => setConsent(GRANTED)}>{copy.accept}</button>
```

Nothing else needs to change for tags: `setConsent` already writes the cookie,
calls `gtag('consent','update', state)` and pushes `consent_update`. A
third-party CMP instead of a hand-rolled banner is fine — have it write
`sf_consent_1` in the same JSON shape, or call `setConsent` from its callback.

**Do not let a CMP re-declare `gtag('consent','default', …)` after the container
loads.** The defaults in `app/layout.tsx` run before GTM on purpose; a second
declaration afterwards overrides the visitor's answer with denied.

### 3. Render it

One line in `app/(marketing)/layout.tsx`, next to `<Tracker />`:

```tsx
<ConsentBanner />
```

Public pages only. It must not be in the `(admin)` group — the console does not
appear in the analytics it exists to inspect.

### 4. Check the two things that will actually be wrong

- **`/admin/events`**: the consent column should start showing Granted and
  Denied instead of Not asked. If everything still says Not asked, the cookie is
  not being written in the shape `readConsent()` expects.
- **Sessions resume.** With consent denied by default and nothing granting it,
  `/admin/sessions` has been empty by design. Grant analytics storage in a real
  browser and a session row should appear. If it does not, the collector is not
  seeing `analytics_storage: "granted"`.

## What changes on its own, with no further work

- Events switch from `not_asked` to real answers — no collector or schema
  change.
- Sessions start being created for visitors who grant.
- Offline conversions: leads become eligible again. The gate is
  `ad_storage === "granted"` (`lib/offline.ts`), and every lead collected during
  the no-banner period stays ineligible for ever, because nobody asked those
  people. That is correct and is not a bug to fix later.

## What this document does not cover

Which CMP to buy, whether a banner is needed for non-EEA traffic, and where the
privacy policy lives. Those are decisions, not wiring.
