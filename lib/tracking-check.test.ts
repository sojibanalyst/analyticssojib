import assert from "node:assert/strict";
import { test } from "node:test";
import {
  combine,
  detect,
  findContainer,
  isBlockedAddress,
  normaliseTarget,
  scanContainer,
  scanPage,
  type CheckResult,
} from "./tracking-check.ts";

/**
 * Two things are tested here, and the first matters far more than the second.
 *
 * The route fetches a URL a stranger typed. If the address gate lets through
 * one private range, the route becomes a way to read the hosting platform's
 * internal services from outside. So the gate is tested against the ranges by
 * name, one at a time, rather than with a handful of examples.
 */

test("only http and https URLs on default ports are accepted", () => {
  assert.equal(normaliseTarget("example.com")?.href, "https://example.com/");
  assert.equal(normaliseTarget("http://example.com/shop?x=1")?.href, "http://example.com/shop?x=1");
  assert.equal(normaliseTarget("https://example.com:443/")?.hostname, "example.com");

  for (const bad of [
    "",
    "   ",
    "ftp://example.com",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "gopher://example.com",
    "https://user:pass@example.com",
    "https://example.com:8080",
    "https://example.com:22",
    "http://localhost",
    "http://app.localhost",
    "http://printer.local",
    "http://service.internal",
    "http://intranet",
    "not a url",
  ]) {
    assert.equal(normaliseTarget(bad), null, `should refuse: ${bad}`);
  }
});

test("a URL longer than the limit is refused", () => {
  assert.equal(normaliseTarget(`https://example.com/${"a".repeat(3000)}`), null);
});

test("the fragment is dropped, since it never reaches a server", () => {
  assert.equal(normaliseTarget("https://example.com/page#section")?.href, "https://example.com/page");
});

test("every private, loopback, link-local and reserved IPv4 range is blocked", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "10.255.255.255",
    "100.64.0.1",
    "100.127.255.254",
    "127.0.0.1",
    "127.1.2.3",
    "169.254.169.254", // the cloud metadata address
    "169.254.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.1",
    "192.0.2.10",
    "192.168.0.1",
    "192.168.255.255",
    "198.18.0.1",
    "198.19.255.255",
    "198.51.100.7",
    "203.0.113.9",
    "224.0.0.1",
    "239.255.255.255",
    "240.0.0.1",
    "255.255.255.255",
  ]) {
    assert.equal(isBlockedAddress(address, 4), true, `should block ${address}`);
  }
});

test("public IPv4 addresses are allowed, including the ones next to a blocked range", () => {
  for (const address of [
    "1.1.1.1",
    "8.8.8.8",
    "9.255.255.255",
    "11.0.0.0",
    "100.63.255.255",
    "100.128.0.0",
    "126.255.255.255",
    "128.0.0.1",
    "169.253.255.255",
    "169.255.0.0",
    "172.15.255.255",
    "172.32.0.0",
    "192.167.255.255",
    "192.169.0.0",
    "198.17.255.255",
    "198.20.0.0",
    "223.255.255.255",
  ]) {
    assert.equal(isBlockedAddress(address, 4), false, `should allow ${address}`);
  }
});

test("something that is not an IPv4 address is blocked rather than tried", () => {
  for (const address of ["", "1.2.3", "1.2.3.4.5", "256.1.1.1", "a.b.c.d", "0x7f.0.0.1"]) {
    assert.equal(isBlockedAddress(address, 4), true, `should block ${address}`);
  }
});

test("IPv6 loopback, unique-local, link-local, multicast and mapped private addresses are blocked", () => {
  for (const address of [
    "::",
    "::1",
    "fc00::1",
    "fd12:3456:789a::1",
    "fe80::1",
    "fe80::1%eth0",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "64:ff9b::192.168.1.1",
    "::ffff:7f00:1",
    "100::1",
  ]) {
    assert.equal(isBlockedAddress(address, 6), true, `should block ${address}`);
  }
});

test("public IPv6 addresses are allowed", () => {
  for (const address of ["2606:4700:4700::1111", "2a00:1450:4001:81b::200e", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(address, 6), false, `should allow ${address}`);
  }
});

const byId = (results: CheckResult[]) => Object.fromEntries(results.map((r) => [r.id, r]));
const page = (html: string) => byId(detect(html, new URL("https://shop.example/")));

/* Fixtures -------------------------------------------------------------- */

/**
 * The page that found the bug, 14 Oct 2026: a server-side setup whose snippet
 * loads the container from the shop's own subdomain under a renamed script,
 * with the id stripped of its GTM- prefix. The first version of the check
 * reported this site as having nothing at all.
 */
const AARAMBEANBAG = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;
j.src='https://aa.aarambeanbag.com/pf.js?c='+i;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','WH7RQ8V6');</script>`;

const GOOGLE_GTM = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-AB12CD3');</script>`;

const GTAG_ONLY = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','G-ABC123DEF4');gtag('config','AW-123456789');</script>`;

const SHOPIFY_PLAIN = `<!doctype html><html><head><title>Plain Shop</title>
<script>window.Shopify = window.Shopify || {}; Shopify.shop = "plain.myshopify.com";</script>
<link rel="stylesheet" href="//plain.myshopify.com/cdn/shop/t/1/assets/base.css"></head>
<body><h1>Our products</h1><p>Part number G-ABCDEFGH ships today.</p></body></html>`;

/**
 * A container body in the shape GTM serves: library code first, then the
 * configuration as JSON assigned to var data. The ids sit in constant
 * variables that the tags point to, as they do in a real container.
 */
const CONTAINER = `// Copyright 2012 Google Inc. All rights reserved.
(function(){
var data = {"resource":{"version":"7","macros":[{"function":"__e"},{"function":"__c","vtp_value":"G-QWERTY1234"},{"function":"__c","vtp_value":"1234567890123456"},{"function":"__c","vtp_value":"https:\\/\\/sgtm.shop.example"}],
"tags":[{"function":"__googtag","vtp_tagId":["macro",1],"vtp_configSettingsTable":["list",["map","parameter","server_container_url","parameterValue",["macro",3]]]},
{"function":"__googtag","vtp_tagId":"AW-987654321"},
{"function":"__cvt_123_45","vtp_pixelIds":["macro",2]},
{"function":"__html","vtp_html":"\\u003cscript\\u003efbq('init','123');fbq('track','PageView');\\u003c\\/script\\u003e"}]}};
var x = "setDefaultConsentState";
})();`;

/* The page ---------------------------------------------------------------- */

test("an empty page has none of them", () => {
  for (const result of detect("<html><body><p>Hello</p></body></html>")) {
    assert.equal(result.found, false, result.id);
    assert.equal(result.source, null, result.id);
  }
});

test("a server-side custom loader is found as GTM, with its host and bare id", () => {
  const ref = findContainer(AARAMBEANBAG, new URL("https://aarambeanbag.com/"));
  assert.deepEqual(ref, {
    id: "WH7RQ8V6",
    url: "https://aa.aarambeanbag.com/pf.js?c=WH7RQ8V6",
    host: "aa.aarambeanbag.com",
    custom: true,
  });

  const result = byId(detect(AARAMBEANBAG, new URL("https://aarambeanbag.com/"))).gtm;
  assert.equal(result.found, true);
  assert.equal(result.source, "page");
  assert.equal(result.evidence, "WH7RQ8V6");
  assert.equal(result.detail, "custom loader on aa.aarambeanbag.com");
});

test("a standard GTM snippet is found with its container URL on Google", () => {
  const ref = findContainer(GOOGLE_GTM, new URL("https://shop.example/"));
  assert.equal(ref?.id, "GTM-AB12CD3");
  assert.equal(ref?.url, "https://www.googletagmanager.com/gtm.js?id=GTM-AB12CD3");
  assert.equal(ref?.custom, false);
  assert.equal(page(GOOGLE_GTM).gtm.detail, null);
});

test("a renamed layer is carried into the container URL", () => {
  const html = GOOGLE_GTM.replace("'dataLayer','GTM-AB12CD3'", "'myLayer','GTM-AB12CD3'");
  assert.equal(
    findContainer(html, new URL("https://shop.example/"))?.url,
    "https://www.googletagmanager.com/gtm.js?id=GTM-AB12CD3&l=myLayer",
  );
});

test("a container loaded by a plain script tag on a Stape-style URL is found", () => {
  const ref = findContainer(
    `<script async src="https://load.shop.example/abcdefgh.js?st=XYZ123"></script>`,
    new URL("https://shop.example/"),
  );
  assert.equal(ref?.host, "load.shop.example");
  assert.equal(ref?.custom, true);
  assert.equal(ref?.id, "XYZ123");
});

test("gtag on its own: GA4 and Google Ads ids, and no GTM", () => {
  const result = page(GTAG_ONLY);
  assert.equal(result.gtm.found, false);
  assert.equal(result.ga4.evidence, "G-ABC123DEF4");
  assert.equal(result.google_ads.evidence, "AW-123456789");
});

test("gtag.js served from the site's own domain is named", () => {
  const html = GTAG_ONLY.replace("https://www.googletagmanager.com/gtag/js", "https://data.shop.example/gtag/js");
  assert.equal(page(html).ga4.detail, "gtag.js from data.shop.example");
});

test("a Shopify page with no tags finds nothing, and a part number is not GA4", () => {
  for (const result of detect(SHOPIFY_PLAIN)) assert.equal(result.found, false, result.id);
});

test("the Meta pixel is found by fbq init and by its noscript image", () => {
  assert.equal(page(`<script>fbq('init', '1234567890123456');</script>`).meta_pixel.evidence, "1234567890123456");
  assert.equal(
    page(`<img src="https://www.facebook.com/tr?id=987654321098&ev=PageView&noscript=1">`).meta_pixel.found,
    true,
  );
  assert.equal(page(`<a href="https://facebook.com/ourpage">Facebook</a>`).meta_pixel.found, false);
});

test("a consent tool is named, and Consent Mode defaults count on their own", () => {
  assert.equal(page(`<script src="https://consent.cookiebot.com/uc.js"></script>`).consent.evidence, "Cookiebot");
  assert.equal(page(`<script src="https://cdn-cookieyes.com/client_data/x/script.js"></script>`).consent.evidence, "CookieYes");
  assert.equal(
    page(`<script>gtag('consent', 'default', {ad_storage:'denied'})</script>`).consent.evidence,
    "Consent Mode defaults",
  );
  assert.equal(page(`<p>We use cookies.</p>`).consent.found, false);
});

/* The container ----------------------------------------------------------- */

test("a container's tags are read through its constant variables", () => {
  const found = scanContainer(CONTAINER);
  assert.equal(found.ga4?.evidence, "G-QWERTY1234");
  assert.equal(found.ga4?.detail, "sent to a server container on sgtm.shop.example");
  assert.equal(found.google_ads?.evidence, "AW-987654321");
  assert.equal(found.meta_pixel?.evidence, "1234567890123456");
  assert.equal(found.consent?.evidence, "Consent Mode defaults");
});

test("fbq inside a custom HTML tag is found once the container's escaping is undone", () => {
  const html = `var data = {"resource":{"tags":[]}}; var t = "\\x3cscript\\x3efbq('init','123456789012');\\x3c\\/script\\x3e";`;
  assert.equal(scanContainer(html).meta_pixel?.evidence, "123456789012");
});

test("a placeholder id like G-SERVER is reported as GA4 tags, not as a measurement id", () => {
  const js = `var data = {"resource":{"macros":[{"function":"__e"},{"function":"__c","vtp_value":"G-SERVER"}],"tags":[{"function":"__gaawe","vtp_measurementIdOverride":["macro",1]}]}};`;
  assert.equal(scanContainer(js).ga4?.evidence, "GA4 tags");
});

test("what is in the page wins; what is only in the container is labelled as such", () => {
  const scanned = scanPage(AARAMBEANBAG, new URL("https://aarambeanbag.com/"));
  const results = byId(combine(scanned.findings, scanContainer(CONTAINER)));
  assert.equal(results.gtm.source, "page");
  assert.equal(results.ga4.source, "container");
  assert.equal(results.meta_pixel.source, "container");
  assert.equal(results.tiktok.found, false);
  assert.equal(results.tiktok.source, null);
});

test("a container that is not a container still gets the text scan", () => {
  const found = scanContainer(`console.log("no data here"); fbq('init','5555555555');`);
  assert.equal(found.meta_pixel?.evidence, "5555555555");
});

test("an encoded container argument inside an escaped JSON string still yields the loader", () => {
  // As stape.io serves it, 14 Oct 2026: the snippet sits in a streamed JSON
  // string, and the last argument is an encoded query, not an id.
  const html = String.raw`self.__next_f.push([1,"(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n j=d.createElement(s);j.async=true;j.src=\n \"https://load.shop.example/sst/abcdefgh.js?\"+i;f.parentNode.insertBefore(j,f);\n })(window,document,'script','dataLayer','c77xs=HQtfLCU%2BWT4w%3D');"])`;
  const ref = findContainer(html, new URL("https://shop.example/"));
  assert.equal(ref?.id, null);
  assert.equal(ref?.host, "load.shop.example");
  assert.equal(ref?.custom, true);
  assert.equal(ref?.url, "https://load.shop.example/sst/abcdefgh.js?c77xs=HQtfLCU%2BWT4w%3D");
});
