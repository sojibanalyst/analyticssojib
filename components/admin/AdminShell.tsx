"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navGroups } from "@/app/(admin)/admin/nav";
import { toggleCollapsed, useCollapsed } from "@/lib/admin-sidebar";
import { toggleTheme, useTheme } from "@/lib/theme";

/**
 * Sidebar + topbar + main, per the console design.
 *
 * Client-side for three reasons and no more: the active link needs the current
 * path, the sidebar collapses, and the theme toggle is the site's existing
 * one. Everything it displays is passed in from the server layout, so no data
 * fetching happens here and no Supabase client is imported — the service role
 * cannot reach a client bundle by accident from this file.
 */
export function AdminShell({
  email,
  signOut,
  children,
}: {
  email: string;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const theme = useTheme();
  const collapsed = useCollapsed();
  const [menuOpen, setMenuOpen] = useState(false);

  // The visible word has to appear in the accessible name, or the two disagree.
  const themeWord = theme === "dark" ? "LIGHT" : "DARK";

  const nav = (
    <>
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="admin-navgroup">{group.title}</p>
          {group.items.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className="admin-navlink"
                aria-current={pathname === item.href ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                // Closes the mobile panel on navigation. Doing it here rather
                // than in an effect on pathname keeps it to one render.
                onClick={() => setMenuOpen(false)}
              >
                <span className="admin-navshort" aria-hidden="true">
                  {item.short}
                </span>
                <span className="admin-navlabel">{item.label}</span>
              </Link>
            ) : (
              // A span, not a link: there is nothing to navigate to yet, and a
              // disabled anchor is worse than no anchor. The phase badge is
              // hidden from assistive tech and restated in the text after it,
              // so it is not announced as a bare "P3".
              <span key={item.href} className="admin-navlink" data-stub="true">
                <span className="admin-navshort" aria-hidden="true">
                  {item.short}
                </span>
                <span className="admin-navlabel">{item.label}</span>
                <span className="admin-navphase" aria-hidden="true">
                  {item.phase}
                </span>
                <span className="sr-only"> — not built yet, {item.phase}</span>
              </span>
            ),
          )}
        </div>
      ))}
    </>
  );

  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <aside className="admin-sidebar" aria-label="Console sections">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            SF
          </span>
          <span className="admin-navlabel admin-brand-word">CONSOLE</span>
        </div>
        {nav}
        <div className="admin-sidebar-foot">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="admin-navlink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
            <span className="admin-navlabel">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="admin-column">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
            aria-label={menuOpen ? "Close console menu" : "Open console menu"}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <div className="admin-topbar-meta">
            <span className="admin-pill" data-tone="info">
              Admin
            </span>
            <span className="admin-topbar-email">{email}</span>
          </div>

          <div className="admin-topbar-actions">
            <Link href="/" className="admin-navlink" data-compact="true">
              View site
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="admin-navlink"
              data-compact="true"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {themeWord}
            </button>
            {signOut}
          </div>
        </header>

        {menuOpen ? (
          <nav
            id="admin-mobile-nav"
            className="admin-mobilenav"
            aria-label="Console sections"
          >
            {nav}
          </nav>
        ) : null}

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
