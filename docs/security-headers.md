# Security headers, and the CSP that is deliberately not shipped

## What ships today

Set in `next.config.ts` for every path:

| Header | Value | Why it cannot break anything |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Stops a browser second-guessing a Content-Type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Full URL to this origin, origin only to anyone else |
| `Permissions-Policy` | camera, microphone, geolocation, payment, USB and the rest set to `()` | Nothing in this codebase uses any of them |
| `Content-Security-Policy` | `frame-ancestors 'none'` | Governs who may frame this site, not what this site may load |
| `Strict-Transport-Security` | set by Vercel | — |

`frame-ancestors` has one visible consequence: **preview and embedding tools
cannot frame the site.** That is the intent, and it was confirmed by watching a
local preview pane fail to load the page the moment the header went on.

## What does not ship: a full CSP

A `script-src` policy is the one that stops XSS, and it is also the one that
breaks Google Tag Manager. GTM's entire job is injecting scripts and inline
snippets at runtime, from hosts that depend on which tags are in the container.
A CSP written before the container exists will be wrong, and the failure mode is
silent: tags stop firing, nothing appears in the UI, and the numbers just get
smaller.

So this needs to be written **after** a container ID goes in, against the tags
actually in use.

### The starting point when that day comes

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.google-analytics.com;
connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.supabase.co;
img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com https://i.ytimg.com;
style-src 'self' 'unsafe-inline';
font-src 'self';
frame-src https://www.youtube-nocookie.com https://calendly.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

Three things to understand before pasting that in:

1. **`'unsafe-inline'` in `script-src` is doing real work here**, and it is most
   of what a CSP is for. The Consent Mode bootstrap, the theme bootstrap and the
   GTM snippet are all inline. Removing it means nonces on every inline script,
   and GTM's own injected inline scripts need `'unsafe-inline'` or
   `'strict-dynamic'` regardless. A CSP with `'unsafe-inline'` is worth
   something — it still constrains hosts — but it is not the XSS defence people
   imagine.
2. **Every tag added to GTM later can break it.** A new tag that calls a host
   not in `connect-src` fails silently. Whoever adds tags has to know the CSP
   exists, or this becomes a recurring mystery.
3. **Report-only first.** Ship it as `Content-Security-Policy-Report-Only`,
   watch the browser console for a week of real traffic, then enforce. Going
   straight to enforcement on a site whose whole product is tracking is a bad
   trade.

### Recommendation

Paste the container ID, get the tags working, confirm conversions are landing,
then do CSP as its own piece of work with the report-only step. Not before.
