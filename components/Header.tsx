"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ctaLabel, nav, site, type NavLink } from "@/content/site";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { toggleTheme, useTheme } from "@/lib/theme";

/**
 * `items` defaults to the full nav. The marketing layout passes a shorter one
 * when nothing has been published: the BLOG entry points at /#blog, and that
 * anchor does not exist on a homepage whose WRITING section rendered nothing,
 * so the link would scroll nowhere.
 */
export function Header({ items = nav }: { items?: NavLink[] }) {
  const theme = useTheme();
  const onHome = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevOverflow = useRef<string>("");

  // The visible word must appear in the accessible name, or the two disagree
  // and screen-reader users hear something different from what they see.
  const themeWord = theme === "dark" ? "LIGHT" : "DARK";
  const themeGlyph = theme === "dark" ? "○" : "●";
  const themeAria = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    burgerRef.current?.focus();
  }, []);

  // The panel only exists below 1024px; if the viewport grows past that while
  // it is open, close it so the scroll lock cannot get stranded.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scroll lock + initial focus.
  useEffect(() => {
    if (!menuOpen) return;
    prevOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = menuRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    first?.focus();
    return () => {
      document.body.style.overflow = prevOverflow.current;
    };
  }, [menuOpen]);

  // Escape closes; Tab is trapped inside the panel.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = menuRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  return (
    <>
      <header className="site-header" data-scrolled={scrolled}>
        {/* The wordmark is the conventional way home, so it is a link, not
            the design's plain span. */}
        <Link href="/" className="wordmark" aria-label={`${site.name} — home`}>
          {site.wordmark.first}
          <span style={{ color: "var(--ink)" }} aria-hidden="true">
            {site.wordmark.accent}
          </span>
          {site.wordmark.last}
        </Link>

        <nav className="header-nav" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === "/" && onHome ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeAria}
            className="theme-toggle"
          >
            {themeWord}
            <span aria-hidden="true" style={{ marginLeft: "0.4em" }}>
              {themeGlyph}
            </span>
          </button>

          <button
            type="button"
            ref={burgerRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="sf-mobile-menu"
            className="header-burger"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <CalendlyPopupButton className="header-cta" placement="header">
            {ctaLabel}
          </CalendlyPopupButton>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="menu-scrim"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <div
            id="sf-mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="mobile-menu"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="menu-link"
                aria-current={item.href === "/" && onHome ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}

            <CalendlyPopupButton className="menu-cta" placement="mobile-menu">
              {ctaLabel} →
            </CalendlyPopupButton>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeAria}
              className="menu-theme"
            >
              {themeWord}
              <span aria-hidden="true" style={{ marginLeft: "0.4em" }}>
                {themeGlyph}
              </span>
            </button>
            <button type="button" onClick={closeMenu} className="menu-close">
              CLOSE ✕
            </button>
          </div>
        </>
      )}
    </>
  );
}
