import "server-only";

import { redactSecrets } from "@/lib/redact";

/**
 * "Test connection" — one harmless request per destination, reporting what the
 * platform actually said.
 *
 * The rule every implementation here follows: report the response, not a
 * verdict about it. "Looks fine" is what lets a wrong token sit unnoticed for
 * three weeks while conversions silently fail. Where a real check is not
 * possible — Google Ads without OAuth — the result says so rather than
 * returning a pass it has not earned.
 *
 * Nothing here sends a conversion. GA4 uses the debug endpoint, Meta and
 * TikTok use their test-event modes, so a test never contaminates reporting.
 */

export type TestOutcome = {
  ok: boolean;
  /**
   * False when the request succeeded but proved nothing about the credentials.
   *
   * This exists because of a measured fact: GA4's /debug/mp/collect returns an
   * EMPTY validationMessages array — indistinguishable from a pass — for a
   * bogus measurement_id AND a bogus api_secret. It validates the payload
   * shape, not the credentials. Reporting that as "Passed" would be the
   * precise false assurance a Test button exists to remove.
   */
  conclusive: boolean;
  /** Shown verbatim on the card. Redacted before it leaves this module. */
  message: string;
};

const TIMEOUT_MS = 10_000;

/** Ten seconds, then give up: a hung test must not hang the Save button. */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function fail(message: string, secret?: string | null): TestOutcome {
  return { ok: false, conclusive: true, message: redactSecrets(message, secret).slice(0, 600) };
}

/** Succeeded, but did not verify the credentials. Says so rather than lying. */
function inconclusive(message: string, secret?: string | null): TestOutcome {
  return { ok: true, conclusive: false, message: redactSecrets(message, secret).slice(0, 600) };
}

function pass(message: string, secret?: string | null): TestOutcome {
  return { ok: true, conclusive: true, message: redactSecrets(message, secret).slice(0, 600) };
}

/* -------------------------------------------------------------------------- */
/* GA4                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * GA4's debug endpoint validates the PAYLOAD, and nothing else.
 *
 * Measured against the live endpoint before this was written:
 *
 *   bogus measurement_id + bogus api_secret  →  validationMessages: []
 *   event name with spaces                   →  NAME_INVALID, with the path
 *   no client_id                             →  VALUE_REQUIRED
 *
 * So an empty array proves the payload would be accepted. It does NOT prove
 * the credentials are right — Google answers 2xx either way, deliberately, so
 * the endpoint cannot be used to enumerate valid measurement ids.
 *
 * That is why an empty array returns INCONCLUSIVE here rather than a pass. A
 * green tick next to a wrong api_secret is the three-weeks-of-silent-failure
 * bug this button was added to prevent, and it would have been shipped if the
 * pass condition had been taken from the documentation instead of tested.
 */
async function testGa4(config: Record<string, string>, secret: string): Promise<TestOutcome> {
  const measurementId = config.measurement_id;
  if (!measurementId) return fail("No measurement ID set.");

  const url =
    `https://www.google-analytics.com/debug/mp/collect` +
    `?measurement_id=${encodeURIComponent(measurementId)}` +
    `&api_secret=${encodeURIComponent(secret)}`;

  const body = {
    // A synthetic client id: this never reaches reporting from /debug.
    client_id: "admin-console-test.1",
    events: [{ name: "page_view", params: { page_location: "https://analyticssojib.com/" } }],
  };

  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      return fail(`HTTP ${res.status} from GA4: ${text}`, secret);
    }

    let parsed: { validationMessages?: { description?: string; validationCode?: string }[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(`Unreadable response from GA4: ${text}`, secret);
    }

    const messages = parsed.validationMessages ?? [];
    if (messages.length === 0) {
      return inconclusive(
        `Payload accepted — GA4 returned an empty validationMessages array for ` +
          `${measurementId}. That confirms the event is well-formed and the ` +
          `endpoint is reachable. It does NOT confirm the credentials: GA4 ` +
          `returns exactly this for a wrong measurement ID and a wrong API ` +
          `secret. Confirm in GA4 → Reports → Realtime, or DebugView.`,
        secret,
      );
    }

    // Verbatim, as asked. A paraphrase of a validation message loses the
    // detail that tells you which field is wrong.
    return fail(
      `GA4 rejected it: ${messages
        .map((m) => `${m.validationCode ?? "?"} — ${m.description ?? "no description"}`)
        .join(" | ")}`,
      secret,
    );
  } catch (error) {
    return fail(`Could not reach GA4: ${(error as Error).message}`, secret);
  }
}

/* -------------------------------------------------------------------------- */
/* Meta Conversions API                                                        */
/* -------------------------------------------------------------------------- */

async function testMeta(config: Record<string, string>, secret: string): Promise<TestOutcome> {
  const pixelId = config.pixel_id;
  if (!pixelId) return fail("No pixel ID set.");

  // test_event_code keeps this out of reporting and into the Test Events tab.
  const testCode = config.test_event_code || "TEST00000";

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events`;
  const payload = new URLSearchParams({
    access_token: secret,
    test_event_code: testCode,
    data: JSON.stringify([
      {
        event_name: "PageView",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: "https://analyticssojib.com/",
        user_data: {},
      },
    ]),
  });

  try {
    const res = await fetchWithTimeout(url, { method: "POST", body: payload });
    const text = await res.text();

    if (!res.ok) return fail(`HTTP ${res.status} from Meta: ${text}`, secret);

    const parsed = JSON.parse(text) as { events_received?: number; error?: { message?: string } };
    if (parsed.error) return fail(`Meta rejected it: ${parsed.error.message}`, secret);
    if (parsed.events_received && parsed.events_received > 0) {
      return pass(
        `Meta accepted ${parsed.events_received} test event(s) under code ${testCode}.`,
        secret,
      );
    }
    return fail(`Meta returned no events_received: ${text}`, secret);
  } catch (error) {
    return fail(`Could not reach Meta: ${(error as Error).message}`, secret);
  }
}

/* -------------------------------------------------------------------------- */
/* TikTok Events API                                                           */
/* -------------------------------------------------------------------------- */

async function testTikTok(config: Record<string, string>, secret: string): Promise<TestOutcome> {
  const pixelCode = config.pixel_code;
  if (!pixelCode) return fail("No pixel code set.");

  const testCode = config.test_event_code || "TEST00000";

  try {
    const res = await fetchWithTimeout(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Access-Token": secret },
        body: JSON.stringify({
          event_source: "web",
          event_source_id: pixelCode,
          test_event_code: testCode,
          data: [
            {
              event: "Pageview",
              event_time: Math.floor(Date.now() / 1000),
              page: { url: "https://analyticssojib.com/" },
            },
          ],
        }),
      },
    );

    const text = await res.text();
    const parsed = JSON.parse(text) as { code?: number; message?: string };

    // TikTok returns HTTP 200 with a non-zero `code` on failure — another
    // endpoint where trusting the status alone reports a pass that is not one.
    if (parsed.code === 0) {
      return pass(`TikTok accepted the test event under code ${testCode}.`, secret);
    }
    return fail(`TikTok rejected it: code ${parsed.code} — ${parsed.message}`, secret);
  } catch (error) {
    return fail(`Could not reach TikTok: ${(error as Error).message}`, secret);
  }
}

/* -------------------------------------------------------------------------- */
/* Google Ads                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Honest by design.
 *
 * Uploading an offline conversion needs an OAuth refresh token and a linked
 * customer id, neither of which this project holds. A developer token alone
 * cannot be validated against anything. Returning a pass here would be
 * inventing assurance — which is precisely the failure the Test button exists
 * to prevent — so this reports what can and cannot be checked.
 */
async function testGoogleAds(config: Record<string, string>, secret: string): Promise<TestOutcome> {
  const customerId = config.customer_id;
  const haveShape = /^[0-9]{10}$/.test((customerId ?? "").replace(/-/g, ""));

  if (!customerId) return fail("No customer ID set.");
  if (!haveShape) return fail(`Customer ID ${customerId} is not ten digits.`);
  if (!secret) return fail("No developer token set.");

  return inconclusive(
    "Customer ID and developer token are both present and well-formed, but " +
      "nothing here has proved they work: the Google Ads API needs an OAuth " +
      "refresh token this project does not hold. Offline conversions are " +
      "exported as CSV and imported by hand, so this is not currently blocking " +
      "anything.",
  );
}

/* -------------------------------------------------------------------------- */
/* Server-side GTM                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A tagging server answers /healthz with "ok".
 *
 * Requesting the bare URL and accepting any 200 would pass against a parked
 * domain, a holding page, or a misconfigured proxy — all of which answer 200
 * and none of which is a tagging server.
 */
async function testSgtm(config: Record<string, string>): Promise<TestOutcome> {
  const endpoint = (config.endpoint ?? "").replace(/\/+$/, "");
  if (!endpoint) return fail("No container URL set.");

  try {
    const res = await fetchWithTimeout(`${endpoint}/healthz`);
    const text = (await res.text()).trim();

    if (res.ok && text.toLowerCase().startsWith("ok")) {
      return pass(`Tagging server responded ok at ${endpoint}/healthz.`);
    }
    return fail(
      `${endpoint}/healthz returned HTTP ${res.status} with "${text.slice(0, 120)}". ` +
        "Something answered, but not a GTM server container.",
    );
  } catch (error) {
    return fail(`Could not reach ${endpoint}: ${(error as Error).message}`);
  }
}

/* -------------------------------------------------------------------------- */

export async function runDestinationTest(
  key: string,
  config: Record<string, string>,
  secret: string | null,
): Promise<TestOutcome> {
  switch (key) {
    case "ga4":
      return secret ? testGa4(config, secret) : fail("No API secret set.");
    case "meta_capi":
      return secret ? testMeta(config, secret) : fail("No access token set.");
    case "tiktok_events":
      return secret ? testTikTok(config, secret) : fail("No access token set.");
    case "google_ads":
      return testGoogleAds(config, secret ?? "");
    case "sgtm":
      return testSgtm(config);
    default:
      return fail(`No test is defined for ${key}.`);
  }
}
