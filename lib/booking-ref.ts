/**
 * The reference that stands in for attribution across the Calendly handoff.
 *
 * Opaque by construction. It goes into utm_content, which means it ends up in
 * a URL the visitor can see, in Calendly's database, and in any analytics
 * Calendly forwards to. So it must carry no information: not the gclid, not
 * the campaign, not an incrementing number that says how many people have
 * booked. A random string that means nothing to anyone without this database.
 */

/** Crockford-ish: no vowels, so it cannot spell anything, and no look-alikes. */
const ALPHABET = "0123456789bcdfghjkmnpqrstvwxz";

/**
 * 16 characters from a 29-symbol alphabet — about 78 bits.
 *
 * Long enough that guessing one is pointless (a guess would have to hit a row
 * that exists AND is unclaimed), short enough to sit in a URL without looking
 * like a tracking parameter, which is exactly what it is not.
 */
const LENGTH = 16;

export function newBookingRef(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);

  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/**
 * Whether a value from utm_content could be one of ours.
 *
 * Checked before it reaches the database: utm_content is a public parameter
 * that anybody can put anything into, including somebody who wants to see what
 * a lookup does with 40KB of text.
 */
export function isBookingRef(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.length !== LENGTH) return false;
  for (const char of value) if (!ALPHABET.includes(char)) return false;
  return true;
}
