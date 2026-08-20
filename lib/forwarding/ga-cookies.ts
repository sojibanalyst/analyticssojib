/**
 * Reading GA4's own identifiers out of its own cookies.
 *
 * These are the two values that decide whether a Measurement Protocol hit
 * joins the visitor's existing GA4 session or invents a new one. Get them
 * wrong and the event still arrives — attributed to a phantom user with a
 * one-event session, which is worse than not sending it, because it looks
 * fine in the reports.
 *
 * OBSERVED, not taken from documentation. Both examples below were read from
 * document.cookie on a live GA4 site (smashingmagazine.com) while writing this:
 *
 *   _ga=GA1.1.1900831477.1787245851
 *   _ga_CXX395KXNG=GS2.1.s1787245851$o1$g0$t1787245851$j60$l0$h0
 *
 * The second one is why this file is defensive. The session cookie used to be
 * dot-delimited — GS1.1.<sessionId>.<sessionNumber>.… — and is now GS2 with
 * DOLLAR-delimited, letter-prefixed fields, where the session id is the `s`
 * field. Both are parsed here. A third format will happen; when it does, this
 * returns null rather than a wrong id, and an event with no session_id is a
 * recoverable loss where an event with somebody else's session id is not.
 */

/**
 * `_ga` → the client id GA4 uses, which is the LAST TWO dot-segments joined,
 * not the whole cookie value.
 *
 *   GA1.1.1900831477.1787245851  →  1900831477.1787245851
 *
 * The leading GA1.1 is a version and a domain-depth counter. Sending the whole
 * value as client_id produces a different user than the browser reports.
 */
export function clientIdFromGaCookie(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.trim().split(".");
  if (parts.length < 4) return null;

  const [random, timestamp] = parts.slice(-2);
  // Both halves are numeric in every version seen. Anything else is not a
  // client id, and guessing would attach the event to a fabricated user.
  if (!/^\d+$/.test(random) || !/^\d+$/.test(timestamp)) return null;

  return `${random}.${timestamp}`;
}

/**
 * `_ga_<STREAM>` → the current session id.
 *
 *   GS2.1.s1787245851$o1$g0$t1787245851$j60$l0$h0   →  1787245851   (observed)
 *   GS1.1.1787245851.1.1.1787245890.0.0.0           →  1787245851   (legacy)
 */
export function sessionIdFromGaCookie(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // GS2 and anything later that keeps the $-delimited, letter-prefixed fields.
  if (raw.includes("$")) {
    const field = raw
      .split("$")
      .map((part) => part.trim())
      .find((part) => /^(?:GS\d+\.\d+\.)?s\d+$/.test(part));
    if (!field) return null;
    const digits = field.replace(/^.*s/, "");
    return /^\d+$/.test(digits) ? digits : null;
  }

  // GS1: dot-delimited, session id in the third position.
  const parts = raw.split(".");
  if (parts.length < 3) return null;
  return /^\d+$/.test(parts[2]) ? parts[2] : null;
}

/**
 * Finds the stream cookie without being told the measurement id.
 *
 * The cookie is named for the stream — _ga_G1ABCD2345 for G-G1ABCD2345 — but a
 * site can carry more than one, so the measurement id is used to pick the right
 * one when it is known, and the sole _ga_* cookie is used when it is not.
 */
export function findStreamCookie(
  cookies: { name: string; value: string }[],
  measurementId: string | null,
): string | null {
  const streams = cookies.filter((c) => c.name.startsWith("_ga_"));
  if (streams.length === 0) return null;

  if (measurementId) {
    const suffix = measurementId.replace(/^G-/, "");
    const exact = streams.find((c) => c.name === `_ga_${suffix}`);
    if (exact) return exact.value;
  }

  // One cookie, one stream: unambiguous. More than one and no measurement id
  // to choose by, so none — a session id from the wrong stream is a wrong
  // session id.
  return streams.length === 1 ? streams[0].value : null;
}
