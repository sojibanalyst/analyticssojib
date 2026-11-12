"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Shot = { src: string; alt: string; width: number; height: number };

/**
 * A lightbox for every screenshot inside it.
 *
 * The page renders its images as it always did, each wrapped in a
 * <button data-lightbox> carrying the full image's src, alt and size. This
 * component listens for clicks on those buttons, collects them in page order,
 * and opens a native <dialog> on the one clicked. The dialog brings focus
 * trapping, Escape to close and the backdrop with it; on close, focus returns
 * to the button that opened it.
 *
 * Inside: the image large, its alt text as the caption (the alt is a real
 * description, so it is worth reading), a counter, and previous and next by
 * button, arrow key or a sideways swipe. The image changes with a short
 * transform and opacity step, and with none under reduced motion.
 *
 * Server components stay server components: only this wrapper is client code.
 */
/**
 * WITH `auto`, EVERY PICTURE ON THE PAGE OPENS. The marketing layout wraps
 * each page in one of these, and it treats any content image as something to
 * open large: project covers, case covers, the portrait. A cover inside a card
 * that is a link opens the picture; the rest of the card still goes to the
 * page, and so does the keyboard, which reaches the link and not the image.
 *
 * What it leaves alone: logos, the avatar, video posters (a click there plays
 * the video), anything in the header or footer, anything marked
 * data-no-zoom, and images inside a lightbox of their own further down the
 * page, which that lightbox handles.
 */
const SKIP = "[data-no-zoom], .clientrow, .tools, .lightbox, .hero-id, header, footer, .track-drawer";
const TITLES = ".pdeck__title, .more-card__title, .cs__title";

function eligible(el: HTMLElement, root: HTMLElement, auto: boolean): boolean {
  if (el.closest(".lightbox-root") !== root) return false;
  if (el.dataset.lightbox !== undefined) return true;
  if (!auto || !(el instanceof HTMLImageElement)) return false;
  if (el.closest("[data-lightbox]") || el.closest(SKIP)) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  return el.getBoundingClientRect().width >= 120;
}

function shotOf(el: HTMLElement): Shot {
  if (!(el instanceof HTMLImageElement)) {
    return {
      src: el.dataset.src ?? "",
      alt: el.dataset.alt ?? "",
      width: Number(el.dataset.w) || 1600,
      height: Number(el.dataset.h) || 1000,
    };
  }
  // An optimised image's address is /_next/image?url=<the file>&w=<a size>.
  // The lightbox wants the file itself, so it can ask for its own size.
  let src = el.currentSrc || el.src;
  try {
    const url = new URL(src, window.location.href);
    src = url.pathname === "/_next/image" ? (url.searchParams.get("url") ?? src) : url.pathname + url.search;
  } catch {
    // Left as it was.
  }
  // A cover's alt is empty on purpose; its card's title says what it is.
  const title = el.closest("a, article, li")?.querySelector(TITLES)?.textContent ?? "";
  return {
    src,
    alt: el.alt || title,
    width: el.naturalWidth || 1600,
    height: el.naturalHeight || 1000,
  };
}

export function Lightbox({
  children,
  label,
  auto = false,
}: {
  children: React.ReactNode;
  label: string;
  /** Open every content image inside, not only the marked buttons. */
  auto?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const startX = useRef<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);

  const selector = auto ? "[data-lightbox], img" : "[data-lightbox]";

  const collect = useCallback(() => {
    const root = rootRef.current;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => eligible(el, root, auto))
      .map((el) => ({ el, shot: shotOf(el) }));
  }, [auto, selector]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(selector);
      if (!button || !root.contains(button) || !eligible(button, root, auto)) return;
      // A modified click is the visitor asking for a new tab, not for this.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // A cover sits inside a card that is a link. Stopping here is what
      // keeps the link from following the same click.
      event.stopPropagation();
      const all = collect();
      setShots(all.map((entry) => entry.shot));
      setIndex(Math.max(0, all.findIndex((entry) => entry.el === button)));
      openerRef.current = button;
      dialogRef.current?.showModal();
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [auto, collect, selector]);

  const n = shots.length;
  const go = useCallback((step: number) => setIndex((i) => (n ? (i + step + n) % n : 0)), [n]);
  const close = () => dialogRef.current?.close();

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  };

  const shot = shots[index];

  return (
    <div ref={rootRef} className={auto ? "lightbox-root lightbox-root--auto" : "lightbox-root"}>
      {children}

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={label}
        onKeyDown={onKeyDown}
        onClose={() => openerRef.current?.focus()}
        // A click on the backdrop lands on the dialog itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current === null) return;
          const dx = event.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {shot ? (
          <figure className="lightbox__figure">
            <Image
              key={shot.src}
              className="lightbox__img"
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="100vw"
              style={{ ["--shot-ratio" as string]: String(shot.width / shot.height) }}
              // The size passed in is a guess where the page did not know it
              // (the case-study screenshots). Once the file has loaded its real
              // shape is known, and the image is sized from that instead.
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  img.style.setProperty("--shot-ratio", String(img.naturalWidth / img.naturalHeight));
                }
              }}
              draggable={false}
            />
            <figcaption className="lightbox__caption">
              <span className="lightbox__count">
                {index + 1} / {n}
              </span>{" "}
              {shot.alt}
            </figcaption>
          </figure>
        ) : null}

        <button type="button" className="lightbox__close icon-btn" onClick={close} aria-label="Close">
          ×
        </button>
        {n > 1 ? (
          <>
            <button
              type="button"
              className="lightbox__nav lightbox__nav--prev icon-btn"
              onClick={() => go(-1)}
              aria-label="Previous screenshot"
            >
              ←
            </button>
            <button
              type="button"
              className="lightbox__nav lightbox__nav--next icon-btn"
              onClick={() => go(1)}
              aria-label="Next screenshot"
            >
              →
            </button>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
