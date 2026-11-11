"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  id: string;
  /**
   * Accessible name for the play control, e.g. "Play client testimonial
   * video 1". The poster frame itself is decorative, so this is the only
   * thing announced for the whole facade.
   */
  label: string;
  orientation: "portrait" | "landscape";
  badge?: string;
  /** Who is speaking, for the review_video_play event. Not shown. */
  client?: string;
};

/**
 * Lite YouTube facade. On first paint this is just an <img> and a button —
 * no third-party JavaScript, no iframe, no cookies. The privacy-enhanced
 * iframe is injected only after the user clicks play.
 */
export function LiteYouTube({ id, label, orientation, badge, client }: Props) {
  const [playing, setPlaying] = useState(false);
  // The sharpest poster YouTube has, and the one every video has. maxresdefault
  // is 1280px wide but only exists for videos uploaded in HD; where it is
  // missing the request fails and the 480px hqdefault takes its place.
  const [poster, setPoster] = useState<"maxresdefault" | "hqdefault">("maxresdefault");
  const portrait = orientation === "portrait";

  return (
    <div
      style={{
        position: "relative",
        background: "var(--surface)",
        overflow: "hidden",
        margin: "0 auto",
        // Portrait is driven by height so a 9:16 frame cannot grow taller than
        // the viewport; landscape is driven by width, as usual.
        ...(portrait
          ? {
              aspectRatio: "9 / 16",
              height: "var(--yt-portrait-h, min(72vh, 520px))",
              width: "auto",
              maxWidth: "100%",
            }
          : { aspectRatio: "16 / 9", width: "100%" }),
      }}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={label}
          data-track-event="review_video_play"
          data-track-client={client ?? "unnamed"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            padding: 0,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            display: "block",
          }}
        >
          {/*
            Decorative, and now says so twice.

            The button's aria-label is the accessible name for the whole
            facade, so the poster must not carry its own alt: a screen reader
            would announce the video once for the button and again for the
            image. An empty alt is the correct markup and always was.

            What it was missing is an EXPLICIT signal. alt="" is the same
            attribute an author leaves empty by accident, so an audit — human
            or automated — cannot tell "decorative on purpose" from
            "forgotten", and this one gets re-reported every time somebody
            checks. aria-hidden makes the intent machine-readable and matches
            what the dark hero image already does. It changes nothing for a
            screen reader; it changes what the markup admits to.
          */}
          <Image
            src={`https://i.ytimg.com/vi/${id}/${poster}.jpg`}
            onError={() => setPoster("hqdefault")}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 767px) 340px, 620px"
            style={{ objectFit: "cover" }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              width: "58px",
              height: "58px",
              borderRadius: "var(--radius-full)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-body)",
              paddingLeft: "3px",
            }}
          >
            ▶
          </span>
          {badge && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                pointerEvents: "none",
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
                background: "var(--bg)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 8px",
              }}
            >
              {badge}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
