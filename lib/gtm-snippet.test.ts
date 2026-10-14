import assert from "node:assert/strict";
import { test } from "node:test";

import { parseGtmSnippet } from "./gtm-snippet.ts";

const GOOGLE = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-AB12CD3');</script>
<!-- End Google Tag Manager -->`;

test("Google's snippet becomes one inline script, and the container id is found", () => {
  const parsed = parseGtmSnippet(GOOGLE);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.scripts.length, 1);
  assert.ok("inline" in parsed.scripts[0] && parsed.scripts[0].inline.includes("gtm.start"));
  assert.equal(parsed.containerId, "GTM-AB12CD3");
});

test("a custom loader with a renamed id still parses; the id may be absent", () => {
  const parsed = parseGtmSnippet(
    `<script>(function(w,d,s,l,i){j.src='https://load.shop.example/abc.js?st='+i;})(window,document,'script','dataLayer','XYZ123');</script>`,
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.containerId, null);
});

test("an external script needs https", () => {
  assert.equal(parseGtmSnippet(`<script async src="https://cdn.example/x.js"></script>`).ok, true);
  assert.equal(parseGtmSnippet(`<script src="http://cdn.example/x.js"></script>`).ok, false);
  assert.equal(parseGtmSnippet(`<script src="/local.js"></script>`).ok, false);
});

test("anything that is not a script or a comment is refused", () => {
  assert.equal(parseGtmSnippet(`${GOOGLE}<meta name="x" content="y">`).ok, false);
  assert.equal(parseGtmSnippet(`<noscript><iframe src="https://x"></iframe></noscript>`).ok, false);
  assert.equal(parseGtmSnippet("hello").ok, false);
  assert.equal(parseGtmSnippet("").ok, false);
});
