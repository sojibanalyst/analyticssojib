import { hero } from "@/content/site";

/**
 * The hero's picture: a tracking pipeline, drawn rather than photographed.
 *
 * Events leave a browser, reach a server-side GTM container on a first-party
 * subdomain, and fan out to GA4, Meta and Google Ads. On Meta the purchase
 * resolves as deduplicated. That is the service, and it is the whole of what
 * this draws.
 *
 * THREE DECISIONS:
 *
 * 1. SVG AND CSS, NO JAVASCRIPT. The dots ride their lines with offset-path
 *    and keyframes (app/components.css, "Pipeline"). Nothing here is a client
 *    component, so the hero costs no hydration and no bundle, and the diagram
 *    is in the HTML the server sends.
 *
 * 2. THE STATIC DRAWING IS COMPLETE. Every node, line and label is real
 *    markup. The animation only adds travelling dots and highlights, so under
 *    reduced motion, or with CSS animations unavailable, what is left is the
 *    full pipeline with the deduplicated badge showing.
 *
 * 3. TWO LAYOUTS, ONE COMPONENT. A 640-wide drawing scaled into a 340px phone
 *    leaves 5px labels. So the same nodes are laid out twice, left-to-right
 *    for wide screens and top-to-bottom for narrow ones, and CSS shows one.
 *    The hidden one is display: none, which also stops its animations.
 *
 * One loop is 12 seconds: an event every four.
 */

type Box = { x: number; y: number; w: number; h: number };

type Layout = {
  name: "wide" | "tall";
  size: [number, number];
  browser: Box;
  server: Box;
  platforms: [Box, Box, Box];
  /** Browser to server. */
  trunk: string;
  /** Server to each platform, in the same order as `platforms`. */
  branches: [string, string, string];
  badge: Box;
};

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
  trunk: "M184 210 H250",
  branches: [
    "M406 210 C456 210 450 70 500 70",
    "M406 210 H500",
    "M406 210 C456 210 450 350 500 350",
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
  trunk: "M170 156 V212",
  branches: [
    "M170 308 C170 356 54 344 54 392",
    "M170 308 V392",
    "M170 308 C170 356 286 344 286 392",
  ],
  badge: { x: 104, y: 458, w: 132, h: 26 },
};

/** Seconds between events. Three events, so the loop is three of these. */
const STEP_S = 4;

const { pipeline } = hero;

function Diagram({ layout }: { layout: Layout }) {
  const { browser, server, platforms, badge } = layout;
  const [w, h] = layout.size;
  const rows = pipeline.events;

  // The event list sits under the browser's title bar. In the wide layout the
  // window is taller, so the list is pushed down to leave room for the two
  // skeleton bars that make it read as a page rather than a list.
  const listTop = browser.y + (layout.name === "wide" ? 96 : 54);

  return (
    <svg
      className={`pipe pipe--${layout.name}`}
      viewBox={`0 0 ${w} ${h}`}
      // The wide and tall drawings say the same thing, so only one is exposed.
      // CSS hides the other with display: none, which removes it from the
      // accessibility tree too; aria-hidden here would double up.
      role="img"
      aria-label={pipeline.label}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Lines first, so the nodes sit on top of where they meet. */}
      <g className="pipe-lines">
        <path d={layout.trunk} />
        {layout.branches.map((d) => (
          <path key={d} d={d} />
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

        <text className="pipe-mono pipe-mono--dim" x={browser.x + 14} y={listTop - 10}>
          dataLayer
        </text>
        {rows.map((name, i) => (
          <g key={name} style={{ ["--d" as string]: `${i * STEP_S}s` }}>
            <circle className="pipe-row-dot" cx={browser.x + 18} cy={listTop + 8 + i * 24} r="3" />
            <text className="pipe-mono pipe-row" x={browser.x + 30} y={listTop + 12 + i * 24}>
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
        <rect className="pipe-server-glow" x={server.x - 6} y={server.y - 6} width={server.w + 12} height={server.h + 12} rx="20" />
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
        <g key={pipeline.platforms[i]} className="pipe-node pipe-node--platform">
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

      {/* The deduplicated badge, under Meta. Appears after the purchase lands. */}
      <g className="pipe-badge" style={{ ["--d" as string]: `${2 * STEP_S}s` }}>
        <rect x={badge.x} y={badge.y} width={badge.w} height={badge.h} rx="13" />
        <text className="pipe-mono" x={badge.x + badge.w / 2} y={badge.y + 17} textAnchor="middle">
          {pipeline.dedupe}
        </text>
      </g>

      {/* The travelling dots. One on the trunk and one per branch, per event.
          Decoration only: the drawing above already says everything. */}
      <g aria-hidden="true">
        {rows.map((name, i) => (
          <g key={name} style={{ ["--d" as string]: `${i * STEP_S}s` }}>
            <circle
              className="pipe-dot pipe-dot--trunk"
              r="4.5"
              style={{ offsetPath: `path("${layout.trunk}")` }}
            />
            {layout.branches.map((d) => (
              <circle
                key={d}
                className="pipe-dot pipe-dot--branch"
                r="4"
                style={{ offsetPath: `path("${d}")` }}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
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
