"use client";

import { useState } from "react";
import {
  reviews,
  upworkUrl,
  type Testimonial,
  type WrittenReview,
} from "@/content/site";
import { LiteYouTube } from "@/components/LiteYouTube";
import { WrittenReviews } from "@/components/sections/WrittenReviews";

export function Reviews({
  items,
  written,
}: {
  items: Testimonial[];
  written: WrittenReview[];
}) {
  const N = items.length;
  const [index, setIndex] = useState(0);
  const go = (n: number) => setIndex(((n % N) + N) % N);

  return (
    <section
      id="reviews"
      className="section section--raised"
      aria-labelledby="reviews-title"
    >
      <div className="section-head">
        <span className="eyebrow">{reviews.eyebrow}</span>
        <span className="eyebrow eyebrow--muted">{reviews.kicker}</span>
      </div>

      <h2
        id="reviews-title"
        className="h2"
        style={{ maxWidth: "26ch", margin: 0 }}
      >
        {reviews.title}
      </h2>

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
            fontFamily: "var(--font-prose)",
            fontSize: "var(--text-label)",
            letterSpacing: "0.14em",
            color: "var(--muted)",
          }}
        >
          VIDEO REVIEWS
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to review ${i + 1}`}
                aria-current={i === index || undefined}
                style={{
                  boxSizing: "border-box",
                  width: "32px",
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
                    width: "24px",
                    height: "6px",
                    borderRadius: "var(--radius-full)",
                    background: i === index ? "var(--accent)" : "var(--border)",
                  }}
                />
              </button>
            ))}
          </div>

          <span
            aria-live="polite"
            style={{
              fontFamily: "var(--font-prose)",
              fontSize: "var(--text-label)",
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
              aria-label="Previous review"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "var(--text-small)" }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next review"
              className="icon-btn"
              style={{ color: "var(--text)", fontSize: "var(--text-small)" }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflow: "hidden" }}>
        <div
          className="review-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item, i) => (
            /* `inert` (not just aria-hidden) so the offscreen slides drop out
               of the tab order too — aria-hidden alone leaves focusable
               descendants reachable by keyboard. */
            <div key={item.id} className="review-slide" inert={i !== index}>
              <div className="review-slide__media">
                <LiteYouTube
                  id={item.id}
                  label={`${item.label} — client video review ${i + 1} of ${N}, recorded on Upwork`}
                  orientation={item.orientation}
                  badge="VIDEO REVIEW"
                />
              </div>

              <div className="review-slide__body">
                <span
                  style={{
                    fontFamily: "var(--font-prose)",
                    fontSize: "var(--text-label)",
                    letterSpacing: "0.1em",
                    color: "var(--result)",
                  }}
                >
                  ★★★★★ VERIFIED CLIENT
                </span>
                {/* No quote is invented. With a quote the client's words lead
                    and the name attributes them; without one the name leads
                    and the video speaks for itself. */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-lead)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    textWrap: "pretty",
                  }}
                >
                  {item.quote ?? item.name ?? item.title ?? reviews.unnamed}
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-prose)",
                    fontSize: "var(--text-label)",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "14px",
                  }}
                >
                  {item.quote
                    ? [item.name, item.role].filter(Boolean).join(" · ")
                    : (item.role ?? reviews.note)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WrittenReviews items={written} />

      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-prose)",
          fontSize: "var(--text-label)",
          letterSpacing: "0.1em",
          color: "var(--faint)",
        }}
      >
        MORE REVIEWS ·{" "}
        <a href={upworkUrl} target="_blank" rel="noopener">
          26 ON UPWORK
        </a>
      </p>
    </section>
  );
}
