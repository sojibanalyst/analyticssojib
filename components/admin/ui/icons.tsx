import {
  Activity,
  BookOpen,
  Briefcase,
  CircleHelp,
  FileText,
  Inbox,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquareQuote,
  Send,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per console screen, keyed by its path. Named imports only, so the
 * bundle carries these fourteen glyphs and not the whole set.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/events": Activity,
  "/admin/sessions": Users,
  "/admin/event-map": MapIcon,
  "/admin/destinations": Send,
  "/admin/leads": Inbox,
  "/admin/offline-conversions": Upload,
  "/admin/posts": FileText,
  "/admin/case-studies": BookOpen,
  "/admin/portfolio": Briefcase,
  "/admin/reviews": MessageSquareQuote,
  "/admin/faqs": CircleHelp,
  "/admin/settings": Settings,
};

export function NavIcon({ href, size = 18 }: { href: string; size?: number }) {
  const Icon = NAV_ICONS[href] ?? LayoutDashboard;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" focusable={false} />;
}
