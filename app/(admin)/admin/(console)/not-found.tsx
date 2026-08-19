import Link from "next/link";

/**
 * The console's own 404, rendered inside the console shell.
 *
 * Next renders a not-found boundary within its segment's layouts, so the
 * sidebar, the topbar and the sign-out button are all still here: a wrong URL
 * is a wrong turn, not an exit from the admin.
 *
 * Reached two ways — the catch-all in [...missing], and any notFound() thrown
 * by a console screen, which is why the copy does not assume a bad URL.
 */
export default function ConsoleNotFound() {
  return (
    <>
      {/* The title comes from the catch-all page's metadata export — a
          not-found file cannot have one of its own. See [...missing]. */}
      <div className="admin-pagehead">
        <h1>No such page</h1>
        <p>
          That address is not one of the console&rsquo;s screens. Nothing is
          broken and nothing was deleted — the URL simply does not resolve to
          anything. Every screen is in the sidebar, and the dashboard is below.
        </p>
      </div>

      <section className="admin-card">
        <h2>Where to go</h2>
        <div className="admin-formfoot">
          <Link href="/admin" className="admin-button">
            Dashboard
          </Link>
          <Link href="/admin/events" className="admin-button" data-variant="ghost">
            Live events
          </Link>
          <Link href="/admin/destinations" className="admin-button" data-variant="ghost">
            Destinations
          </Link>
        </div>
      </section>
    </>
  );
}
