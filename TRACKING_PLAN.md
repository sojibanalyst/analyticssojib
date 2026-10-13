# TRACKING_PLAN.md

Every event analyticssojib.com fires, what triggers it, what it carries, and where it goes.

This describes the code as it is on the `redesign-2026` branch. The public page at `/tracking-plan` is a sample plan for a client store and is a different document.

## How an event travels

1. Something happens in the browser. `components/Tracker.tsx` (or, for bookings, `components/CalendlyPopupButton.tsx`) calls `track(name, params)`.
2. `lib/track.ts` generates **one** `event_id` (a UUID) and uses it twice:
   - pushes `{ event: name, ...params, event_id }` to `window.dataLayer`
   - posts the event to `/api/collect`, the site's own first-party collector, which stores it in Supabase
3. The collector's fan-out worker can forward a stored event to a destination (GA4 Measurement Protocol, Meta CAPI and so on) under the same `event_id`.

Because the browser and the server carry the same id, Meta, TikTok and Google Ads can deduplicate a browser tag against the server event. **GA4 cannot.** GA4 does not deduplicate on `event_id`, so each event must reach GA4 by exactly one route. See "Destinations" below.

## Current state: what is and is not live

| Piece | State |
|---|---|
| dataLayer pushes | Live. Every event below is pushed with its `event_id`. |
| First-party collector (`/api/collect`) | Live. |
| GTM web container | **Not loaded.** No container id is set, so nothing reads the dataLayer yet. The events queue harmlessly. |
| Server-side GTM | **Not set up.** `NEXT_PUBLIC_SGTM_URL` is supported and empty. |
| Consent banner | **None, by decision.** Consent Mode v2 defaults are declared (everything denied except `security_storage`) and nothing updates them. Every stored event records `{"status":"not_asked"}`. |
| Sessions | Not created. The collector only issues a session id when `analytics_storage` is `granted`, which cannot happen without a consent interface. |

To switch GTM on later: set the container id in `/admin/settings` (or `NEXT_PUBLIC_GTM_ID`), and optionally `NEXT_PUBLIC_SGTM_URL` to the origin of the server container so `gtm.js` loads first-party. **Read `docs/consent-re-enable.md` first** if the site will see EEA or UK traffic: a container that sets cookies with no consent interface has no lawful basis there.

## Events

`section` is added automatically to every click event: the id of the nearest `<section>` (`services`, `work`, `reviews`, `about`, `contact` and so on), or `hero`, `header`, `footer`, `dock`, `announcement`, or `page`.

| Event | Trigger | Parameters | Fired from |
|---|---|---|---|
| `page_view` | First load and every client-side route change. Fired again once if consent is granted after landing. | `page_path` (path + query string) | `Tracker.tsx` |
| `cta_click` | A click on anything styled as a button (`.btn`, the header and menu CTAs) that is not a booking button and has no `data-track-event` of its own. | `cta_id` (the element id, else a slug of its text), `cta_text`, `section` | `Tracker.tsx`, delegated |
| `book_call_click` | A click on any "Book a call" button, before the Calendly popup opens. | `section`, `placement` (same value, kept for older bookings) | `CalendlyPopupButton.tsx` |
| `whatsapp_click` | A click on any link to `wa.me`. | `section` | `Tracker.tsx`, delegated |
| `case_study_view` | Landing on `/case-studies/<slug>`. | `case_id` (the slug) | `Tracker.tsx` |
| `review_video_play` | A click on a video review's play button. YouTube is only loaded at this moment. | `client` (the client name, the video's title, or `unnamed`), `section` | `LiteYouTube.tsx` markup, `Tracker.tsx` listener |
| `scroll_depth` | Scrolling past 25, 50, 75 and 90% of the page. Once each per page. Not fired on a page shorter than the screen. | `percent`: `25` \| `50` \| `75` \| `90` | `Tracker.tsx` |
| `form_start` | The first focus inside the enquiry form. Once per page load. | `form` (`contact`), `section` | `Tracker.tsx`, delegated |
| `generate_lead` | A successful enquiry form submission. | `form` (`contact`), `platform` (the visitor's choice in the form, `other` if none), `event_id` | `LeadForm.tsx`, see the note below |
| `tracking_check_run` | A free tracking check that returned a result. | `found` (how many of the four were found, 0 to 4). The address that was checked is not sent. | `TrackingCheck.tsx` |
| `consent_update` | Would fire when a consent choice is stored. Dormant: nothing calls `setConsent()`. | `consent_state` | `lib/consent.ts` |

### `generate_lead` is different, on purpose

It does not go through `track()`. The server action that saves the enquiry writes the single event row in the same transaction as the lead and returns that row's `event_id`, and the browser pushes `generate_lead` to the dataLayer with **that** id. So there is one event, one id, and no second row from the browser.

### How to mark an element

No component calls `track()` for its own clicks. An element declares what it is and the one listener does the rest:

```html
<a href="#services" data-track-event="cta_click" data-track-cta-id="see-how-i-work">
```

`data-track-event` is the event name. Every other `data-track-*` attribute becomes a parameter with its name in snake_case (`data-track-cta-id` is `cta_id`). A marked element takes priority over the automatic `whatsapp_click` and `cta_click` rules.

The attribute is `data-track-event`, not `data-track`: a bare `[data-track]` is already a CSS hook for the carousels.

## Destinations

| Event | dataLayer | Collector | GA4 | Meta / Ads / TikTok |
|---|---|---|---|---|
| `page_view` | yes | yes | browser tag in GTM | optional, browser |
| `cta_click`, `whatsapp_click`, `scroll_depth`, `form_start`, `case_study_view`, `review_video_play`, `tracking_check_run` | yes | yes | browser tag in GTM | not needed |
| `book_call_click` | yes | yes | browser tag in GTM | browser tag, as a soft conversion |
| `generate_lead` | yes | yes (written by the server action) | **server only**, Measurement Protocol | browser tag plus server event, deduplicated on `event_id` |

Rule for GA4: one route per event. `lib/forwarding/ga4.ts` accepts exactly one event name for the Measurement Protocol and rejects the rest in code. Do not add a GA4 browser tag for `generate_lead`.

No GTM tags exist yet. This table is what to build when the container is created.

## What is excluded

- **The console.** `Tracker` is not mounted under `/admin`, so the console never appears in its own data.
- **The owner's visits.** If a Supabase auth cookie is present in the browser (someone is signed in to the console), `track()` sends nothing: no dataLayer push and no collector request. The event is still listed in the "What I'm tracking about you" drawer, marked as not sent.

## What a visitor can see

- **"What I'm tracking about you"** (bottom-left button, every public page): the events this browser has sent during this page load, each with a plain-English explanation. Read from memory in the tab. Nothing is fetched and nothing is stored.
- **"This site, tracked live"** (homepage): the latest events from the collector, as event name, page path and time only. Served by `/api/events/recent`, which reads the `public_recent_events` view. The view allowlists event names and public paths, removes query strings, and exposes no session id, event id, parameter or consent record.

## What the collector stores with each event

`event_name`, `event_id`, the time, the page path including its query string, the parameters above, and the consent record. The browser also sends the referrer, the page title and the screen width; the title and width are discarded, and the referrer is only used when a session row is written. It does not store an IP address. A session row (session id, attribution, referrer, user agent, country) is only written once `analytics_storage` is granted, which does not happen today.
