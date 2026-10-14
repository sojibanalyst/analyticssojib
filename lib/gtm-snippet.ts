/**
 * The GTM <head> snippet as pasted in the console, taken apart.
 *
 * React cannot insert a pasted string of HTML into <head> and have its
 * scripts run, so the snippet is split into its scripts: inline ones are
 * rendered as <script> with their text, external ones as <script async src>.
 * Only <script> tags and HTML comments are accepted; anything else makes the
 * snippet invalid, so a stray tag cannot reach every page's <head>.
 *
 * A plain module so it can be tested and used by both the console's save
 * action and the site's layout.
 */

export type HeadScript = { inline: string } | { src: string };

export type ParsedSnippet =
  | { ok: true; scripts: HeadScript[]; containerId: string | null }
  | { ok: false; reason: string };

export const MAX_SNIPPET_LENGTH = 20000;

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;

export function parseGtmSnippet(raw: string): ParsedSnippet {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "The snippet is empty." };
  if (text.length > MAX_SNIPPET_LENGTH) return { ok: false, reason: "The snippet is longer than 20,000 characters." };

  const scripts: HeadScript[] = [];
  for (const match of text.matchAll(SCRIPT)) {
    const attrs = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (src) {
      let url: URL;
      try {
        url = new URL(src);
      } catch {
        return { ok: false, reason: "A script src is not a full https address." };
      }
      if (url.protocol !== "https:") return { ok: false, reason: "A script src must use https." };
      scripts.push({ src: url.href });
    } else if (body) {
      // A closing tag inside the text would end the script early on the page.
      if (/<\/script/i.test(body)) return { ok: false, reason: "A script contains a closing script tag." };
      scripts.push({ inline: body });
    }
  }

  const rest = text.replace(SCRIPT, "").replace(COMMENT, "").trim();
  if (rest) return { ok: false, reason: "Only <script> tags belong in the head code. Paste the <head> part of the GTM snippet." };
  if (!scripts.length) return { ok: false, reason: "No <script> tag found." };

  const containerId = /\bGTM-[A-Z0-9]{4,10}\b/.exec(text)?.[0] ?? null;
  return { ok: true, scripts, containerId };
}
