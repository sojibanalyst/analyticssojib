"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseShot } from "@/content/site";

/**
 * Evidence gallery for a case card: a scroll-snapped track of screenshots with
 * dots, a counter and arrows, matching the review carousels elsewhere.
 *
 * Position is read back from the track's own scrollLeft so dragging, arrow
 * keys and the buttons all agree. Only the first image is eager — the rest are
 * lazy, so a card with four screenshots still costs one image on load.
 */
export function CaseGallery({ shots, label }: { shots: CaseShot[]; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const lock = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const step = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    return first.getBoundingClientRect().width + 12;
  }, []);

  const go = useCallback(
    (n: number) => {
      const el = trackRef.current;
      const s = step();
      if (!el || !s) return;
      const i = Math.max(0, Math.min(n, shots.length - 1));
      setIndex(i);
      lock.current = true;
      clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => {
        lock.current = false;
      }, 700);
      el.scrollTo({ left: i * s, behavior: "smooth" });
    },
    [step, shots.length],
  );

  useEffect(() => () => clearTimeout(lockTimer.current), []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const s = step();
    if (!s || lock.current) return;
    const i = Math.round(e.currentTarget.scrollLeft / s);
    if (i !== index) setIndex(i);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  const single = shots.length < 2;

  return (
    <div className="case-gallery">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={single ? -1 : 0}
        role="group"
        aria-label={`${label} — evidence screenshots`}
        data-track="1"
        className="case-gallery__track"
      >
        {shots.map((shot, i) => (
          <figure key={shot.src} className="case-gallery__item">
            <div className="case-shot">
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                sizes="(max-width: 1279px) 100vw, 1232px"
                loading={i === 0 ? "eager" : "lazy"}
                style={{ objectFit: "cover" }}
              />
            </div>
            <figcaption className="case-gallery__caption">{shot.caption}</figcaption>
          </figure>
        ))}
      </div>

      {!single && (
        <div className="case-gallery__pager">
          <div className="case-gallery__dots">
            {shots.map((shot, i) => (
              <button
                key={shot.src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show screenshot ${i + 1} of ${shots.length}`}
                aria-current={i === index || undefined}
              >
                <span data-active={i === index || undefined} />
              </button>
            ))}
          </div>

          <span aria-live="polite" className="case-gallery__count">
            {String(index + 1).padStart(2, "0")} / {String(shots.length).padStart(2, "0")}
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous screenshot"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "13px" }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next screenshot"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "13px" }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
