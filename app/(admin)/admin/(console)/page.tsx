import { ExternalLink, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { QuickLeads } from "@/components/admin/leads/QuickLeads";
import { PageHeader } from "@/components/admin/ui/Basics";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "./leads/statuses";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * A count, or the reason there isn't one.
 *
 * Distinguishing "0" from "the query failed" matters more here than anywhere
 * else on the site: this console exists to tell the owner whether tracking is
 * working, and a failed query rendered as a confident 0 would be the exact
 * failure it is meant to catch.
 */
type Metric =
  | { label: string; value: number; note: string }
  | { label: string; error: string; note: string };

/** head + exact = the count only, no rows over the wire. */
type CountResult = { count: number | null; error: { message: string } | null };

function toMetric(label: string, note: string, result: CountResult): Metric {
  if (result.error) return { label, error: result.error.message, note };
  return { label, value: result.count ?? 0, note };
}

/** Outside the component: reading the clock during render is not pure. */
function twentyFourHoursAgo(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

type NewLead = { id: string; name: string; email: string; company: string | null; created_at: string; status: LeadStatus };

/**
 * The console's first screen: the four counts, the newest leads with their
 * status one change away, what in the content needs attention (each line opens
 * the list already filtered), and the everyday actions.
 *
 * The "Build status" card is gone: every screen is built, and a card that only
 * says "nothing outstanding" is noise on the screen read most often.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const since = twentyFourHoursAgo();
  const head = { count: "exact", head: true } as const;

  const [leads, newLeads, events, sessions, latest, drafts, unconfirmed, noImages, hiddenReviews] =
    await Promise.all([
      supabase.from("leads").select("*", head),
      supabase.from("leads").select("*", head).eq("status", "new"),
      supabase.from("events").select("*", head).gte("occurred_at", since),
      supabase.from("sessions").select("*", head).gte("last_seen_at", since),
      supabase
        .from("leads")
        .select("id, name, email, company, created_at, status")
        .eq("status", "new")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("posts").select("id", head).or("status.eq.draft,is_draft.eq.true"),
      supabase.from("case_studies").select("id", head).eq("needs_confirmation", true),
      supabase.from("portfolio_items").select("id", head).eq("images", "[]"),
      supabase.from("reviews").select("id", head).eq("published", false),
    ]);

  const metrics: Metric[] = [
    toMetric("Leads", "All time", leads),
    toMetric("New leads", "Awaiting a reply", newLeads),
    toMetric("Events", "Last 24 hours", events),
    toMetric("Sessions", "Last 24 hours", sessions),
  ];

  const health: { label: string; result: CountResult; href: string }[] = [
    { label: "Draft or unfinished posts", result: drafts, href: "/admin/posts?filter=notLive" },
    { label: "Case studies with unconfirmed figures", result: unconfirmed, href: "/admin/case-studies?filter=check" },
    { label: "Projects with no images", result: noImages, href: "/admin/portfolio?filter=noImages" },
    { label: "Hidden reviews", result: hiddenReviews, href: "/admin/reviews?filter=notLive" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Today at a glance. A failed read says Query failed, never zero." />

      <div className="ax-metrics">
        {metrics.map((metric) => (
          <div className="ax-metric" key={metric.label}>
            <p className="ax-metric__label">{metric.label}</p>
            {"error" in metric ? (
              <>
                <p className="ax-badge" data-status="needs-check">
                  Query failed
                </p>
                <p className="ax-field__error">{metric.error}</p>
              </>
            ) : (
              <p className="ax-metric__value">{metric.value.toLocaleString("en-US")}</p>
            )}
            <p className="ax-field__hint">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="ax-dash">
        <section className="ax-panel" aria-labelledby="dash-leads">
          <header className="ax-panel__head">
            <h2 id="dash-leads" className="ax-panel__title">
              New leads
            </h2>
            <Link href="/admin/leads" className="ax-panel__more" prefetch={false}>
              All leads
            </Link>
          </header>
          {latest.error ? (
            <p className="ax-field__error">Query failed: {latest.error.message}</p>
          ) : (
            <QuickLeads leads={(latest.data ?? []) as NewLead[]} />
          )}
        </section>

        <section className="ax-panel" aria-labelledby="dash-health">
          <header className="ax-panel__head">
            <h2 id="dash-health" className="ax-panel__title">
              Content health
            </h2>
          </header>
          <ul className="ax-health">
            {health.map((line) => (
              <li key={line.label}>
                <Link href={line.href} className="ax-health__row" prefetch={false}>
                  <span>{line.label}</span>
                  {line.result.error ? (
                    <span className="ax-badge" data-status="needs-check">
                      Query failed
                    </span>
                  ) : (
                    <span className="ax-health__n" data-zero={(line.result.count ?? 0) === 0 || undefined}>
                      {line.result.count ?? 0}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="ax-panel" aria-labelledby="dash-actions">
          <header className="ax-panel__head">
            <h2 id="dash-actions" className="ax-panel__title">
              Quick actions
            </h2>
          </header>
          <div className="ax-quick">
            <Link href="/admin/reviews?new=1" className="ax-btn" prefetch={false}>
              <Plus size={15} aria-hidden="true" /> New review
            </Link>
            <Link href="/admin/portfolio?new=1" className="ax-btn" prefetch={false}>
              <Plus size={15} aria-hidden="true" /> New project
            </Link>
            <Link href="/admin/case-studies?new=1" className="ax-btn" prefetch={false}>
              <Plus size={15} aria-hidden="true" /> New case study
            </Link>
            <a href="/" className="ax-btn" target="_blank" rel="noopener">
              <ExternalLink size={15} aria-hidden="true" /> Open site
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
