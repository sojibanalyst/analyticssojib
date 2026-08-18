import { notFound } from "next/navigation";

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
