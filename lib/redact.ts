/**
 * Taking credentials out of text.
 *
 * Deliberately its own module with no `server-only` guard, unlike
 * lib/secrets.ts which reads secrets and must never reach a browser bundle.
 * This is pure string manipulation that holds nothing sensitive, and keeping
 * it separate means it can be unit-tested — a redactor nobody can run tests
 * against is a redactor nobody has checked.
 */

/**
 * Parameter names that carry a credential in a URL or a payload.
 *
 * GA4 puts `api_secret` in the query string of the Measurement Protocol
 * endpoint, so any code that logs a failed request URL leaks it. Meta and
 * TikTok use `access_token` the same way.
 */
/**
 * The `"?` after the key name is not decoration. In JSON the key is quoted —
 * `{"api_secret":"…"}` — so the closing quote sits between the name and the
 * colon. Without it this matched query strings and silently missed every
 * JSON body, which is the shape most API errors arrive in.
 */
const SENSITIVE_PARAM =
  /\b(api_secret|access_token|refresh_token|developer_token|client_secret|token|apikey|api_key|password|secret)"?\s*[=:]\s*("?)([^&\s"',}]+)\2/gi;

/** Below this length a "secret" is too generic to search for safely. */
const MIN_LITERAL = 8;

/**
 * Scrub anything that looks like a credential out of text bound for a log, an
 * error column or a screen.
 *
 * Two passes, because either alone is insufficient: the pattern pass catches
 * credentials this code has never seen, and the literal pass catches a secret
 * that appears with no recognisable key in front of it.
 *
 * A short tail is kept on pattern matches so two different bad credentials
 * still produce different messages — otherwise every auth failure reads the
 * same and the log stops being diagnostic.
 */
export function redactSecrets(
  text: string,
  ...literals: (string | null | undefined)[]
): string {
  let out = text.replace(SENSITIVE_PARAM, (_match, key, quote, value) => {
    const raw = String(value);
    const tail = raw.length >= 12 ? `…${raw.slice(-4)}` : "";
    return `${key}=${quote}[REDACTED${tail}]${quote}`;
  });

  for (const literal of literals) {
    // A 4-character needle would blank out unrelated words and leave the
    // message useless, which is its own kind of failure.
    if (literal && literal.length >= MIN_LITERAL) {
      out = out.split(literal).join("[REDACTED]");
    }
  }

  return out;
}
