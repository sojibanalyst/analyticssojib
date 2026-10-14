"use client";

import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createHref,
  navGroupFor,
  navGroups,
  navItemFor,
  type BadgeCounts,
} from "@/app/(admin)/admin/nav";
import { paletteIndex } from "@/app/(admin)/admin/(console)/palette-actions";
import { CommandPalette } from "@/components/admin/ui/CommandPalette";
import { NavIcon } from "@/components/admin/ui/icons";
import { ToastProvider } from "@/components/admin/ui/Toast";
import { toggleCollapsed, useCollapsed } from "@/lib/admin-sidebar";
import { toggleTheme, useTheme } from "@/lib/theme";

/** Where each content screen's items appear on the public site. */
const ON_SITE: Record<string, string> = {
  "/admin/posts": "/blog",
  "/admin/case-studies": "/case-studies",
  "/admin/portfolio": "/work",
  "/admin/reviews": "/reviews",
  "/admin/faqs": "/services#faq",
};

/**
 * The console's frame: sidebar, top bar, main.
 *
 * SIDEBAR: an icon and a label per screen, grouped as before, with a count
 * badge where one helps (new leads, drafts, hidden items). It collapses to an
 * icon rail on wide screens and becomes a slide-in drawer on phones.
 *
 * TOP BAR: breadcrumbs, a search button that opens the command palette
 * (Ctrl/Cmd+K), the screen's primary "New ..." action, "View on site", the
 * theme toggle and a user menu with sign out.
 *
 * Client-side because the active link needs the path, the sidebar and menus
 * open and close, and the theme toggle is the site's own. Every count it shows
 * is passed in from the server layout; nothing here queries the database
 * except the palette's search, which goes through a Server Action.
 */
export function AdminShell({
  email,
  signOut,
  counts,
  children,
}: {
  email: string;
  signOut: () => Promise<void>;
  counts: BadgeCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const collapsed = useCollapsed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const current = navItemFor(pathname);
  const group = current ? navGroupFor(current) : undefined;
  const onSite = current ? ON_SITE[current.href] : undefined;

  /**
   * Prefetch on intent, not on sight. Every link points at a dynamic page
   * whose server component runs a Supabase query; prefetching all twelve on
   * render was twelve database round trips for pages nobody opened.
   */
  const warm = useCallback((href: string) => () => router.prefetch(href), [router]);

  const nav = (onNavigate?: () => void) =>
    navGroups.map((g) => (
      <div key={g.title} className="ax-navgroup">
        <p className="ax-navgroup__title">{g.title}</p>
        {g.items.map((item) => {
          const count = item.badge ? counts[item.badge] ?? 0 : 0;
          const isCurrent = current?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="ax-navlink"
              aria-current={isCurrent ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              prefetch={false}
              onMouseEnter={warm(item.href)}
              onFocus={warm(item.href)}
              onClick={onNavigate}
            >
              <NavIcon href={item.href} />
              <span className="ax-navlink__label">{item.label}</span>
              {count > 0 ? (
                <span className="ax-navlink__badge" aria-label={`${count} ${badgeWord(item.badge!)}`}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    ));

  return (
    <ToastProvider>
      <div className="ax-shell" data-collapsed={collapsed}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        <nav className="ax-sidebar" aria-label="Console sections">
          <Brand />
          <div className="ax-sidebar__nav">{nav()}</div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="ax-navlink ax-sidebar__collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight size={18} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={18} aria-hidden="true" />
            )}
            <span className="ax-navlink__label">Collapse</span>
          </button>
        </nav>

        <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)}>
          {nav(() => setMenuOpen(false))}
        </MobileNav>

        <div className="ax-column">
          <header className="ax-topbar">
            <button
              type="button"
              className="ax-iconbtn ax-burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open console menu"
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            <nav className="ax-crumbs" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/admin" prefetch={false}>
                    Console
                  </Link>
                </li>
                {group && current && current.href !== "/admin" ? (
                  <>
                    <li aria-hidden="true">
                      <ChevronRight size={14} />
                    </li>
                    <li className="ax-crumbs__group">{group.title}</li>
                    <li aria-hidden="true">
                      <ChevronRight size={14} />
                    </li>
                    <li aria-current="page">{current.label}</li>
                  </>
                ) : null}
              </ol>
            </nav>

            <div className="ax-topbar__actions">
              <button type="button" className="ax-searchbtn" onClick={() => setPaletteOpen(true)}>
                <Search size={15} aria-hidden="true" />
                <span className="ax-searchbtn__label">Search</span>
                <kbd className="ax-kbd" aria-hidden="true">
                  Ctrl K
                </kbd>
              </button>

              {onSite ? (
                <a href={onSite} className="ax-btn" data-variant="ghost" target="_blank" rel="noopener">
                  <ExternalLink size={15} aria-hidden="true" />
                  <span className="ax-hide-phone">View on site</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}

              {current?.create ? (
                <Link href={createHref(current)} className="ax-btn" data-variant="primary" prefetch={false}>
                  <Plus size={15} aria-hidden="true" />
                  <span className="ax-hide-phone">{current.create}</span>
                  <span className="sr-only ax-show-phone-sr">{current.create}</span>
                </Link>
              ) : null}

              <button
                type="button"
                className="ax-iconbtn"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>

              <UserMenu email={email} signOut={signOut} />
            </div>
          </header>

          <main id="main" className="ax-main">
            {children}
          </main>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} load={paletteIndex} />
      </div>
    </ToastProvider>
  );
}

function badgeWord(badge: string): string {
  return badge === "newLeads" ? "new" : badge === "postDrafts" || badge === "caseDrafts" ? "drafts" : "hidden";
}

function Brand() {
  return (
    <Link href="/admin" className="ax-brand" prefetch={false} aria-label="Console home">
      <span className="ax-brand__mark" aria-hidden="true">
        S
      </span>
      <span className="ax-brand__word">
        Sojib<span className="ax-brand__dot">.</span> <span className="ax-brand__sub">Console</span>
      </span>
    </Link>
  );
}

/**
 * The sidebar on phones: a drawer that slides in from the left, on the native
 * <dialog> so focus stays inside and Escape closes it.
 */
function MobileNav({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ax-mnav"
      aria-label="Console menu"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <nav className="ax-mnav__panel" aria-label="Console sections">
        <div className="ax-mnav__head">
          <Brand />
          <button type="button" className="ax-iconbtn" aria-label="Close menu" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </nav>
    </dialog>
  );
}

/** The signed-in address and Sign out, behind the avatar. */
function UserMenu({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ax-user" ref={ref}>
      <button
        type="button"
        className="ax-user__btn"
        aria-expanded={open}
        aria-controls="ax-user-menu"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        {email.slice(0, 1).toUpperCase()}
      </button>
      {open ? (
        <div id="ax-user-menu" className="ax-user__menu">
          <p className="ax-user__email">{email}</p>
          <form action={signOut}>
            <button type="submit" className="ax-user__item">
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
