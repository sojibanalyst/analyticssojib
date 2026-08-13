/**
 * The console's navigation, in one place.
 *
 * `ready: false` renders the link as a disabled stub rather than hiding it.
 * The shell is being built phase by phase, and a nav that silently grows is
 * harder to review than one that states up front what is not built yet — a
 * link that 404s is worse than a label that says "P3".
 *
 * Phase labels match the build plan: P2 content, P3 collector, P4 leads,
 * P5 offline conversions, P6 content admin.
 */
export type NavItem = {
  href: string;
  label: string;
  /**
   * Two characters shown when the sidebar collapses to a 60px rail. Spelled
   * out per item rather than sliced off the label, so no two collide by
   * accident. There is no icon set here on purpose: this is a monospace
   * console, and a letter pair reads better than a borrowed glyph.
   */
  short: string;
  ready: boolean;
  /** Shown on stubs so the phase that delivers the screen is visible. */
  phase?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", short: "DS", ready: true }],
  },
  {
    title: "Tracking",
    items: [
      {
        href: "/admin/events",
        label: "Live events",
        short: "EV",
        ready: true,
      },
      {
        href: "/admin/sessions",
        label: "Sessions",
        short: "SE",
        ready: true,
      },
      {
        href: "/admin/event-map",
        label: "Event map",
        short: "MP",
        ready: true,
      },
      {
        href: "/admin/destinations",
        label: "Destinations",
        short: "DE",
        ready: true,
      },
    ],
  },
  {
    title: "Demand",
    items: [
      {
        href: "/admin/leads",
        label: "Leads",
        short: "LD",
        ready: true,
      },
      {
        href: "/admin/offline-conversions",
        label: "Offline conversions",
        short: "OC",
        ready: true,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        href: "/admin/posts",
        label: "Posts",
        short: "PO",
        ready: false,
        phase: "P6",
      },
      {
        href: "/admin/case-studies",
        label: "Case studies",
        short: "CS",
        ready: false,
        phase: "P6",
      },
      {
        href: "/admin/reviews",
        label: "Reviews",
        short: "RV",
        ready: false,
        phase: "P6",
      },
      {
        href: "/admin/faqs",
        label: "FAQs",
        short: "FQ",
        ready: false,
        phase: "P6",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        short: "ST",
        ready: false,
        phase: "P6",
      },
    ],
  },
];
