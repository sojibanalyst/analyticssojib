import assert from "node:assert/strict";
import { test } from "node:test";
import { detect, isBlockedAddress, normaliseTarget } from "./tracking-check.ts";

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

const byId = (html: string) => Object.fromEntries(detect(html).map((r) => [r.id, r]));

test("an empty page has none of the four", () => {
  for (const result of detect("<html><body><p>Hello</p></body></html>")) {
    assert.equal(result.found, false, result.id);
    assert.equal(result.evidence, null, result.id);
  }
});

test("a GTM container is found by its snippet and its id is reported", () => {
  const result = byId(
    `<script>(function(w,d,s,l,i){j.src='https://www.googletagmanager.com/gtm.js?id='+i})(window,document,'script','dataLayer','GTM-AB12CD3');</script>`,
  );
  assert.equal(result.gtm.found, true);
  assert.equal(result.gtm.evidence, "GTM-AB12CD3");
  assert.equal(result.ga4.found, false);
});

test("GA4 is found by gtag.js and its measurement id is reported", () => {
  const result = byId(
    `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script><script>gtag('config','G-ABC123DEF4')</script>`,
  );
  assert.equal(result.ga4.found, true);
  assert.equal(result.ga4.evidence, "G-ABC123DEF4");
});

test("a G- string in ordinary text is not GA4", () => {
  assert.equal(byId(`<p>Our part number is G-ABC123DEF4.</p>`).ga4.found, false);
});

test("the Meta pixel is found by fbq init and by its noscript image", () => {
  assert.equal(byId(`<script>fbq('init', '1234567890123456');</script>`).meta_pixel.evidence, "1234567890123456");
  assert.equal(
    byId(`<img src="https://www.facebook.com/tr?id=987654321098&ev=PageView&noscript=1">`).meta_pixel.found,
    true,
  );
  assert.equal(byId(`<a href="https://facebook.com/ourpage">Facebook</a>`).meta_pixel.found, false);
});

test("a consent tool is named, and Consent Mode defaults count on their own", () => {
  assert.equal(
    byId(`<script src="https://consent.cookiebot.com/uc.js" data-cbid="x"></script>`).consent.evidence,
    "Cookiebot",
  );
  assert.equal(
    byId(`<script>gtag('consent', 'default', {ad_storage:'denied'})</script>`).consent.evidence,
    "Consent Mode defaults",
  );
  assert.equal(byId(`<p>We use cookies.</p>`).consent.found, false);
});
