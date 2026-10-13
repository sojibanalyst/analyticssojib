import type { CSSProperties } from "react";

import { hero } from "@/content/site";

/**
 * The hero's picture: a tracking pipeline, drawn rather than photographed.
 *
 * Events leave a browser, reach a server-side GTM container on a first-party
 * subdomain, and fan out to GA4, Meta and Google Ads. On Meta the purchase
 * resolves as deduplicated. That is the service, and it is the whole of what
 * this draws.
 *
 * FOUR DECISIONS:
 *
 * 1. THE DRAWING IS AN SVG AND IT DOES NOT MOVE. Every node, line and label is
 *    static markup in the HTML the server sends. Under reduced motion, or with
 *    animations unavailable, this is the whole picture and it is complete.
 *
 * 2. THE MOTION IS A LAYER OF PLAIN ELEMENTS ON TOP, and only `transform` and
 *    `opacity` are ever animated. The first version animated `fill`, `stroke`
 *    and `offset-distance` on the SVG's own elements. None of those can run on
 *    the compositor, so the browser recalculated style and repainted on the
 *    main thread for every frame, for ever. Measured with real CPU throttling
 *    it cost a slow phone a second of LCP and half of its main thread. Dots,
 *    highlights and the badge are now positioned <span>s, which the compositor
 *    moves without asking the main thread anything.
 *
 * 3. NO JAVASCRIPT. Positions are viewBox coordinates multiplied by one custom
 *    property, --u, which is "one viewBox unit" in container-query units. The
 *    overlay therefore scales with the drawing at any width, with no resize
 *    listener and no hydration.
 *
 * 4. TWO LAYOUTS, ONE COMPONENT. A 640-wide drawing scaled into a 340px phone
 *    leaves 5px labels. So the same nodes are laid out twice, left-to-right
 *    for wide screens and top-to-bottom for narrow ones, and CSS shows one.
 *    The hidden one is display: none, which also stops its animations.
 *
 * One loop is 12 seconds: an event every four. The keyframes are in
 * app/components.css under "Pipeline".
 */

type Box = { x: number; y: number; w: number; h: number };
type Point = [number, number];

type Layout = {
  name: "wide" | "tall";
  size: [number, number];
  browser: Box;
  server: Box;
  platforms: [Box, Box, Box];
  /** Browser to server: the drawn line, and the two points a dot moves between. */
  trunk: { d: string; from: Point; to: Point };
  /**
   * Server to each platform. `d` is the drawn curve. A dot cannot follow a
   * curve with a transform alone, so it travels start, `mid`, end in two
   * straight legs; `mid` is the point the curve itself passes through halfway,
   * which keeps the dot on the line where it matters.
   */
  branches: [Branch, Branch, Branch];
  badge: Box;
};

type Branch = { d: string; from: Point; mid: Point; to: Point };

const WIDE: Layout = {
  name: "wide",
  size: [640, 420],
  browser: { x: 8, y: 112, w: 176, h: 196 },
  server: { x: 250, y: 152, w: 156, h: 116 },
  platforms: [
    { x: 500, y: 40, w: 132, h: 60 },
    { x: 500, y: 180, w: 132, h: 60 },
    { x: 500, y: 320, w: 132, h: 60 },
  ],
  trunk: { d: "M184 210 H250", from: [184, 210], to: [250, 210] },
  branches: [
    { d: "M406 210 C456 210 450 70 500 70", from: [406, 210], mid: [453, 140], to: [500, 70] },
    { d: "M406 210 H500", from: [406, 210], mid: [453, 210], to: [500, 210] },
    { d: "M406 210 C456 210 450 350 500 350", from: [406, 210], mid: [453, 280], to: [500, 350] },
  ],
  badge: { x: 500, y: 248, w: 132, h: 26 },
};

const TALL: Layout = {
  name: "tall",
  size: [340, 500],
  browser: { x: 70, y: 24, w: 200, h: 132 },
  server: { x: 80, y: 212, w: 180, h: 96 },
  platforms: [
    { x: 4, y: 392, w: 100, h: 56 },
    { x: 120, y: 392, w: 100, h: 56 },
    { x: 236, y: 392, w: 100, h: 56 },
  ],
  trunk: { d: "M170 156 V212", from: [170, 156], to: [170, 212] },
  branches: [
    { d: "M170 308 C170 356 54 344 54 392", from: [170, 308], mid: [112, 350], to: [54, 392] },
    { d: "M170 308 V392", from: [170, 308], mid: [170, 350], to: [170, 392] },
    { d: "M170 308 C170 356 286 344 286 392", from: [170, 308], mid: [228, 350], to: [286, 392] },
  ],
  badge: { x: 104, y: 458, w: 132, h: 26 },
};

/** Seconds between events. Three events, so the loop is three of these. */
const STEP_S = 4;
const ROW_H = 24;

const { pipeline } = hero;

/** Where the event list starts, inside the browser window. */
function listTop(layout: Layout): number {
  // In the wide layout the window is taller, so the list is pushed down to
  // leave room for the two skeleton bars that make it read as a page.
  return layout.browser.y + (layout.name === "wide" ? 96 : 54);
}

/** A box in viewBox units, as CSS that scales with the drawing. */
function place(box: Box): CSSProperties {
  return {
    left: `calc(${box.x} * var(--u))`,
    top: `calc(${box.y} * var(--u))`,
    width: `calc(${box.w} * var(--u))`,
    height: `calc(${box.h} * var(--u))`,
  };
}

const vars = (values: Record<string, string | number>) => values as CSSProperties;

function Drawing({ layout }: { layout: Layout }) {
  const { browser, server, platforms } = layout;
  const [w, h] = layout.size;
  const top = listTop(layout);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      // The wide and tall drawings say the same thing. CSS hides one with
      // display: none, which removes it from the accessibility tree too.
      role="img"
      aria-label={pipeline.label}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Lines first, so the nodes sit on top of where they meet. */}
      <g className="pipe-lines">
        <path d={layout.trunk.d} />
        {layout.branches.map((branch) => (
          <path key={branch.d} d={branch.d} />
        ))}
      </g>

      {/* Browser ----------------------------------------------------------- */}
      <g className="pipe-node">
        <rect x={browser.x} y={browser.y} width={browser.w} height={browser.h} rx="12" />
        <path
          className="pipe-rule"
          d={`M${browser.x} ${browser.y + 28} H${browser.x + browser.w}`}
        />
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="pipe-chrome"
            cx={browser.x + 14 + i * 11}
            cy={browser.y + 14}
            r="3"
          />
        ))}
        <text className="pipe-mono pipe-mono--dim" x={browser.x + 54} y={browser.y + 18}>
          {pipeline.browser.title}
        </text>

        {layout.name === "wide" && (
          <>
            <rect
              className="pipe-skel"
              x={browser.x + 14}
              y={browser.y + 44}
              width={browser.w - 60}
              height="8"
              rx="4"
            />
            <rect
              className="pipe-skel"
              x={browser.x + 14}
              y={browser.y + 60}
              width={browser.w - 96}
              height="8"
              rx="4"
            />
          </>
        )}

        <text className="pipe-mono pipe-mono--dim" x={browser.x + 14} y={top - 10}>
          dataLayer
        </text>
        {pipeline.events.map((name, i) => (
          <g key={name}>
            <circle className="pipe-row-dot" cx={browser.x + 18} cy={top + 8 + i * ROW_H} r="3" />
            <text className="pipe-mono" x={browser.x + 30} y={top + 12 + i * ROW_H}>
              {name}
            </text>
          </g>
        ))}
      </g>
      <text
        className="pipe-cap"
        x={layout.name === "wide" ? browser.x : browser.x + browser.w / 2}
        y={browser.y - 10}
        textAnchor={layout.name === "wide" ? "start" : "middle"}
      >
        {pipeline.browser.caption}
      </text>

      {/* Server ------------------------------------------------------------ */}
      <g className="pipe-node pipe-node--server">
        <rect x={server.x} y={server.y} width={server.w} height={server.h} rx="14" />
        <text
          className="pipe-title"
          x={server.x + server.w / 2}
          y={server.y + server.h / 2 - 6}
          textAnchor="middle"
        >
          {pipeline.server.title}
        </text>
        <text
          className="pipe-mono pipe-host"
          x={server.x + server.w / 2}
          y={server.y + server.h / 2 + 16}
          textAnchor="middle"
        >
          {pipeline.server.host}
        </text>
      </g>
      {/* Left-aligned in both layouts. Centred, it sat on top of the line coming
          down from the browser in the tall one. */}
      <text className="pipe-cap pipe-cap--accent" x={server.x} y={server.y - 14}>
        {pipeline.server.caption}
      </text>

      {/* Platforms --------------------------------------------------------- */}
      {platforms.map((box, i) => (
        <g key={pipeline.platforms[i]} className="pipe-node">
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="12" />
          <text
            className="pipe-title pipe-title--sm"
            x={box.x + box.w / 2}
            y={box.y + box.h / 2 + 5}
            textAnchor="middle"
          >
            {pipeline.platforms[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Everything that moves. Decoration, so hidden from screen readers: the
 * drawing's label already says all of it, and the badge's words are in it.
 */
function Motion({ layout }: { layout: Layout }) {
  const { browser, server, platforms, badge } = layout;
  const top = listTop(layout);

  return (
    <div className="pipe-fx" aria-hidden="true">
      {/* The row for the event that is firing. */}
      {pipeline.events.map((name, i) => (
        <span
          key={name}
          className="pipe-fx__row"
          style={{
            ...place({ x: browser.x + 8, y: top - 4 + i * ROW_H, w: browser.w - 16, h: ROW_H }),
            ...vars({ "--d": `${i * STEP_S}s` }),
          }}
        />
      ))}

      <span
        className="pipe-fx__glow"
        style={place({ x: server.x - 6, y: server.y - 6, w: server.w + 12, h: server.h + 12 })}
      />

      {platforms.map((box, i) => (
        <span key={i} className="pipe-fx__hit" style={place(box)} />
      ))}

      {/* Under Meta, after the purchase lands. */}
      <span
        className="pipe-fx__badge"
        style={{ ...place(badge), ...vars({ "--d": `${2 * STEP_S}s` }) }}
      >
        {pipeline.dedupe}
      </span>

      {/* One dot on the trunk and one per branch, for each event. */}
      {pipeline.events.map((name, i) => (
        <span key={name} className="pipe-fx__event" style={vars({ "--d": `${i * STEP_S}s` })}>
          <span
            className="pipe-dot pipe-dot--trunk"
            style={vars({
              "--x0": layout.trunk.from[0],
              "--y0": layout.trunk.from[1],
              "--x1": layout.trunk.to[0],
              "--y1": layout.trunk.to[1],
            })}
          />
          {layout.branches.map((branch) => (
            <span
              key={branch.d}
              className="pipe-dot pipe-dot--branch"
              style={vars({
                "--x0": branch.from[0],
                "--y0": branch.from[1],
                "--xm": branch.mid[0],
                "--ym": branch.mid[1],
                "--x1": branch.to[0],
                "--y1": branch.to[1],
              })}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

function Diagram({ layout }: { layout: Layout }) {
  const [w, h] = layout.size;
  return (
    <div
      className={`pipe pipe--${layout.name}`}
      // --u is one viewBox unit. The box has the viewBox's aspect ratio, so the
      // same unit is right on both axes.
      style={{ aspectRatio: `${w} / ${h}`, ...vars({ "--u": `calc(100cqw / ${w})` }) }}
    >
      <Drawing layout={layout} />
      <Motion layout={layout} />
    </div>
  );
}

export function PipelineSvg() {
  return (
    <>
      <Diagram layout={WIDE} />
      <Diagram layout={TALL} />
    </>
  );
}
