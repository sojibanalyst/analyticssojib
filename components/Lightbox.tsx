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
export function Lightbox({ children, label }: { children: React.ReactNode; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const startX = useRef<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);

  const collect = useCallback(
    () =>
      [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-lightbox]") ?? [])].map((el) => ({
        el,
        shot: {
          src: el.dataset.src ?? "",
          alt: el.dataset.alt ?? "",
          width: Number(el.dataset.w) || 1600,
          height: Number(el.dataset.h) || 1000,
        },
      })),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("[data-lightbox]");
      if (!button || !root.contains(button)) return;
      event.preventDefault();
      const all = collect();
      setShots(all.map((entry) => entry.shot));
      setIndex(Math.max(0, all.findIndex((entry) => entry.el === button)));
      openerRef.current = button;
      dialogRef.current?.showModal();
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [collect]);

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
    <div ref={rootRef} className="lightbox-root">
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
