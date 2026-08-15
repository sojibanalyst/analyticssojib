/**
 * What each destination needs configured, and which half of it is secret.
 *
 * Written as a table rather than as GA4 plus four special cases: every one of
 * these has the same shape — one public identifier that is visible in any
 * page running the tag, and one credential that must never come back out of
 * the database. The console renders both from this spec, so adding a
 * destination is a row here rather than a new form.
 */

export type PublicField = {
  /** Key inside destinations.config (jsonb). */
  key: string;
  label: string;
  placeholder: string;
  /** Applied as the input's `pattern`, and re-checked on the server. */
  pattern?: string;
  /** Shown when the value does not match. Must say what a good one looks like. */
  patternHint?: string;
  help: string;
};

export type SecretField = {
  label: string;
  help: string;
  /**
   * Read if the database has no value. Lets a destination keep working
   * through a migration, and lets a deployment run without the console.
   */
  envVar: string;
};

export type DestinationSpec = {
  label: string;
  public?: PublicField;
  secret?: SecretField;
};

/**
 * GA4's measurement_id is the clearest case of the distinction: it is printed
 * in the page source of every site running GA4, so treating it as a secret
 * would be theatre. The api_secret is a credential and travels as a QUERY
 * PARAMETER on the Measurement Protocol endpoint, which is why the redaction
 * trigger in migration 20260815000001 exists.
 */
export const DESTINATION_SPECS: Record<string, DestinationSpec> = {
  ga4: {
    label: "GA4 Measurement Protocol",
    public: {
      key: "measurement_id",
      label: "Measurement ID",
      placeholder: "G-XXXXXXX",
      pattern: "^G-[A-Z0-9]{6,12}$",
      patternHint: "Looks like G-XXXXXXX — capital G, a hyphen, then 6–12 capitals or digits.",
      help: "Not a secret. It is in the page source of every site running GA4.",
    },
    secret: {
      label: "API secret",
      help: "Admin → Data Streams → your stream → Measurement Protocol API secrets.",
      envVar: "GA4_API_SECRET",
    },
  },

  meta_capi: {
    label: "Meta Conversions API",
    public: {
      key: "pixel_id",
      label: "Pixel ID",
      placeholder: "123456789012345",
      pattern: "^[0-9]{10,20}$",
      patternHint: "Digits only, usually 15 of them.",
      help: "Not a secret. It is in the page source wherever the pixel runs.",
    },
    secret: {
      label: "Access token",
      help: "Events Manager → your pixel → Settings → Conversions API access token.",
      envVar: "META_CAPI_TOKEN",
    },
  },

  google_ads: {
    label: "Google Ads (enhanced conversions)",
    public: {
      key: "customer_id",
      label: "Customer ID",
      placeholder: "123-456-7890",
      pattern: "^[0-9]{3}-?[0-9]{3}-?[0-9]{4}$",
      patternHint: "Ten digits, with or without hyphens.",
      help: "Not a secret. It is the account number shown in the Google Ads UI.",
    },
    secret: {
      label: "Developer token",
      help: "Google Ads API Center. Distinct from the OAuth credentials.",
      envVar: "GOOGLE_ADS_DEVELOPER_TOKEN",
    },
  },

  tiktok_events: {
    label: "TikTok Events API",
    public: {
      key: "pixel_code",
      label: "Pixel code",
      placeholder: "CXXXXXXXXXXXXXXXXXXX",
      help: "Not a secret. It is in the page source wherever the pixel runs.",
    },
    secret: {
      label: "Access token",
      help: "Events Manager → your pixel → Settings → generate access token.",
      envVar: "TIKTOK_ACCESS_TOKEN",
    },
  },

  sgtm: {
    label: "Server-side GTM",
    public: {
      key: "endpoint",
      label: "Container URL",
      placeholder: "https://sgtm.yourdomain.com",
      pattern: "^https://.+",
      patternHint: "Must be an https:// URL.",
      help: "Not a secret. It is the endpoint the browser already posts to.",
    },
    // No secret: an sGTM container is reached by URL, and whatever it forwards
    // to holds its own credentials.
  },
};

export function specFor(key: string): DestinationSpec | undefined {
  return DESTINATION_SPECS[key];
}
