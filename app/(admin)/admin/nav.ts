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
  /** Two letters, kept for the command palette and as a fallback label. The
   *  sidebar rail shows the icon from components/admin/ui/icons.tsx. */
  short: string;
  ready: boolean;
  /** Shown on stubs so the phase that delivers the screen is visible. */
  phase?: string;
  /** Which count, if any, shows as a badge beside the link. */
  badge?: "newLeads" | "postDrafts" | "caseDrafts" | "portfolioHidden" | "reviewsHidden";
  /** The "New ..." action this screen offers, in the top bar and Ctrl+K. */
  create?: string;
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
        badge: "newLeads",
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
        ready: true,
        badge: "postDrafts",
        create: "New post",
      },
      {
        href: "/admin/case-studies",
        label: "Case studies",
        short: "CS",
        ready: true,
        badge: "caseDrafts",
        create: "New case study",
      },
      {
        href: "/admin/portfolio",
        label: "Portfolio",
        short: "PF",
        ready: true,
        badge: "portfolioHidden",
        create: "New project",
      },
      {
        href: "/admin/reviews",
        label: "Reviews",
        short: "RV",
        ready: true,
        badge: "reviewsHidden",
        create: "New review",
      },
      {
        href: "/admin/faqs",
        label: "FAQs",
        short: "FQ",
        ready: true,
        create: "New FAQ",
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
        ready: true,
      },
    ],
  },
];

export type BadgeCounts = Partial<Record<NonNullable<NavItem["badge"]>, number>>;

/** The nav item a path belongs to: its own entry, or the closest parent. */
export function navItemFor(pathname: string): NavItem | undefined {
  const items = navGroups.flatMap((group) => group.items);
  return (
    items.find((item) => item.href === pathname) ??
    items
      .filter((item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]
  );
}

/** The group a nav item sits in, for the breadcrumb. */
export function navGroupFor(item: NavItem): NavGroup | undefined {
  return navGroups.find((group) => group.items.includes(item));
}

/** The URL that opens a screen's "New ..." form. */
export function createHref(item: NavItem): string {
  return `${item.href}?new=1`;
}
