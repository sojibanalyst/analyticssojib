"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reviews, type WrittenReview } from "@/content/site";

/**
 * The design's written-review carousel: a scroll-snapped track with dots, an
 * index counter and arrow buttons, 3 cards visible on desktop, 2 on tablet,
 * 1 on mobile.
 *
 * The pager is driven from the track's own scroll position rather than from
 * React state alone, so dragging, arrow keys and the buttons all stay in sync.
 */
export function WrittenReviews({ items }: { items: WrittenReview[] }) {
  const N = items.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const lockRef = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const step = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    return first.getBoundingClientRect().width + 14;
  }, []);

  const go = useCallback(
    (n: number) => {
      const el = trackRef.current;
      const s = step();
      if (!el || !s) return;
      const max = Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / s));
      const i = Math.max(0, Math.min(n, max));
      setIndex(i);
      // Ignore the scroll events this animation emits, or mid-flight
      // positions rewrite the index.
      lockRef.current = true;
      clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => {
        lockRef.current = false;
      }, 700);
      el.scrollTo({ left: i * s, behavior: "smooth" });
    },
    [step],
  );

  useEffect(() => () => clearTimeout(lockTimer.current), []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const s = step();
    if (!s || lockRef.current) return;
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

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            color: "var(--muted)",
          }}
        >
          {reviews.writtenTitle}
        </span>

        <div className="written-pager">
          {/* Eight dots plus the counter and arrows do not fit a 360px screen;
              the dots drop away there and the arrows carry the interaction. */}
          <div className="written-dots">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to written review ${i + 1}`}
                aria-current={i === index || undefined}
                style={{
                  boxSizing: "border-box",
                  width: "20px",
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "6px",
                    borderRadius: "3px",
                    background: i === index ? "var(--accent)" : "var(--border)",
                  }}
                />
              </button>
            ))}
          </div>

          <span
            aria-live="polite"
            style={{
              fontFamily: "var(--font-data)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
              color: "var(--muted)",
              minWidth: "54px",
            }}
          >
            {String(index + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous written review"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "13px" }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next written review"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "13px" }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Client written reviews"
        data-track="1"
        className="written-track"
      >
        {items.map((item, i) => (
          <figure key={i} className="written-card" data-placeholder={item.placeholder}>
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: item.placeholder ? "var(--faint)" : "var(--result)",
              }}
            >
              ★★★★★ VERIFIED
            </span>
            <blockquote
              style={{
                margin: 0,
                fontSize: "15px",
                lineHeight: 1.6,
                color: item.placeholder ? "var(--faint)" : "var(--text)",
                textWrap: "pretty",
              }}
            >
              {item.quote}
            </blockquote>
            <figcaption
              style={{
                fontFamily: "var(--font-data)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                borderTop: "1px solid var(--border)",
                paddingTop: "14px",
                marginTop: "auto",
              }}
            >
              {item.attribution}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
