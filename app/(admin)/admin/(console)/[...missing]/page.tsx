import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * The title for the console's 404, set here because a not-found file cannot
 * export metadata — Next only reads it from layouts and pages.
 *
 * Without it a wrong admin URL sat in the tab as "Sojib H. — Web analytics and
 * tracking specialist", the root layout's default, which is the public site's
 * title on a page that is neither public nor that site.
 *
 * Measured, because it does not behave like ordinary page metadata: the HTML
 * the server streams still carries the root title, and this one is applied
 * when the not-found body renders. The tab ends up reading "No such page —
 * Sojib H.". That is the whole visible surface here — /admin is noindex and
 * behind auth, so no crawler ever sees either version.
 */
export const metadata: Metadata = {
  title: "No such page",
  robots: { index: false, follow: false },
};

/**
 * Any /admin/* path that is not a real screen.
 *
 * Without this, an unmatched admin URL fell through to the ROOT not-found —
 * the public 404, rendered outside the console, with the sidebar gone and one
 * button pointing at the marketing homepage. Getting back in meant retyping
 * the URL from memory.
 *
 * A catch-all cannot shadow a real screen: static segments beat dynamic ones
 * in Next's router, so /admin/events still resolves to /admin/events. This
 * only ever runs when nothing else matched.
 *
 * It calls notFound() rather than rendering the message itself, because the
 * status code matters as much as the pixels — a page that looks like a 404 and
 * answers 200 is a page a crawler will index. The UI lives in the sibling
 * not-found.tsx, which Next renders INSIDE this route group's layout, which is
 * what keeps the console shell around it.
 */
export default function AdminCatchAll(): never {
  notFound();
}
