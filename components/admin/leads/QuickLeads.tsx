"use client";

import Link from "next/link";

import { LeadPill, StatusSelect, useLeadStatus, when } from "@/components/admin/leads/LeadsWorkspace";
import type { LeadStatus } from "@/app/(admin)/admin/(console)/leads/statuses";

type Lead = { id: string; name: string; company: string | null; email: string; created_at: string; status: LeadStatus };

/** The latest new leads on the dashboard, each with its status one change away. */
export function QuickLeads({ leads }: { leads: Lead[] }) {
  const { statusOf, change } = useLeadStatus();
  if (!leads.length) return <p className="ax-field__hint">No new leads. Everything has a reply.</p>;
  return (
    <ul className="ax-quickleads">
      {leads.map((lead) => (
        <li key={lead.id} className="ax-quickleads__row">
          <Link href={`/admin/leads?lead=${lead.id}`} className="ax-quickleads__who" prefetch={false}>
            <span className="ax-list__title">{lead.name}</span>
            <span className="ax-list__sub">
              {lead.company ?? lead.email} · {when(lead.created_at)}
            </span>
          </Link>
          <LeadPill status={statusOf(lead)} />
          <StatusSelect lead={lead} value={statusOf(lead)} onChange={(next) => void change(lead, next)} />
        </li>
      ))}
    </ul>
  );
}
