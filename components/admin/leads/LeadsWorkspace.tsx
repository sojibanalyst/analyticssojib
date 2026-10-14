"use client";

import { KanbanSquare, List, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  archiveLead,
  changeLeadStatus,
  eraseLead,
  saveLeadNotes,
} from "@/app/(admin)/admin/(console)/leads/actions";
import { LEAD_STATUSES, type LeadStatus } from "@/app/(admin)/admin/(console)/leads/statuses";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { EmptyState } from "@/components/admin/ui/Basics";
import { Drawer } from "@/components/admin/ui/Drawer";
import { useToast } from "@/components/admin/ui/Toast";

export type LeadRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string | null;
  platform: string | null;
  answers: unknown;
  status: LeadStatus;
  notes: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  landing_page: string | null;
  referrer: string | null;
  last_touch_source: string | null;
  last_touch_medium: string | null;
  last_touch_campaign: string | null;
  last_landing_page: string | null;
  last_referrer: string | null;
  first_seen_at: string | null;
  attribution_status: string;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  msclkid: string | null;
  wbraid: string | null;
  gbraid: string | null;
  li_fat_id: string | null;
  origin: string;
  booked_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
};

const LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
};

const VIEW_KEY = "sf-admin-leads-view";

export function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
        " UTC";
}

function problemOf(lead: LeadRow): string {
  const answers = (lead.answers ?? {}) as Record<string, unknown>;
  return typeof answers.problem === "string" ? answers.problem : "";
}

/** The status as a pill: the word, a dot, and a tone, never colour alone. */
export function LeadPill({ status }: { status: LeadStatus }) {
  return (
    <span className="ax-lpill" data-status={status}>
      <span className="ax-badge__dot" aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}

/** A select that changes a lead's status at once, with a toast and Undo. */
export function StatusSelect({
  lead,
  value,
  onChange,
}: {
  lead: { id: string; name: string };
  value: LeadStatus;
  onChange: (next: LeadStatus) => void;
}) {
  return (
    <label className="ax-lselect">
      <span className="sr-only">Status for {lead.name}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as LeadStatus)}>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Optimistic status changes with Undo, shared by the list, the board and the dashboard. */
export function useLeadStatus() {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [override, setOverride] = useState<Record<string, LeadStatus>>({});

  const change = async (lead: { id: string; status: LeadStatus }, next: LeadStatus) => {
    const previous = override[lead.id] ?? lead.status;
    if (previous === next) return;
    setOverride((o) => ({ ...o, [lead.id]: next }));
    const result = await changeLeadStatus(lead.id, next);
    if (result.status === "error") {
      setOverride((o) => ({ ...o, [lead.id]: previous }));
      toast({ message: result.message, tone: "error" });
      return;
    }
    toast({
      message: result.message,
      undo: async () => {
        setOverride((o) => ({ ...o, [lead.id]: previous }));
        const back = await changeLeadStatus(lead.id, previous);
        if (back.status !== "error") startTransition(() => router.refresh());
      },
    });
    startTransition(() => router.refresh());
  };

  return { statusOf: (lead: { id: string; status: LeadStatus }) => override[lead.id] ?? lead.status, change };
}

/**
 * Leads: a list with search and status chips, or a board with a column per
 * status where a card is dragged to change its status (the status menu on
 * each card does the same from the keyboard). A lead opens in a drawer with
 * its message, its attribution exactly as stored, and notes.
 *
 * Nothing here changes how a lead is written or what offline conversions
 * export: the only writes are the status, the notes, archive and erase, all
 * through the existing allowlist-checked actions.
 */
export function LeadsWorkspace({ leads, archived }: { leads: LeadRow[]; archived: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeadStatus | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null);
  const { statusOf, change } = useLeadStatus();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      // Reading a stored preference once on mount; the server cannot know it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "board" || saved === "list") setView(saved);
    } catch {
      // Storage blocked: the list is the default.
    }
  }, []);

  const pickView = (next: "list" | "board") => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembered, still switched.
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        (!filter || statusOf(lead) === filter) &&
        (!q ||
          `${lead.name} ${lead.email} ${lead.company ?? ""} ${problemOf(lead)} ${lead.source ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [leads, query, filter, statusOf]);

  const openId = params.get("lead");
  const open = openId ? leads.find((lead) => lead.id === openId) : undefined;
  const openLead = (id: string) => router.push(`${pathname}?${new URLSearchParams({ ...(archived ? { view: "archived" } : {}), lead: id })}`, { scroll: false });
  const closeLead = () => router.push(archived ? `${pathname}?view=archived` : pathname, { scroll: false });

  return (
    <>
      <div className="ax-table__tools">
        <label className="ax-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search leads</span>
          <input
            type="search"
            value={query}
            placeholder="Search name, email, message"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {view === "list" ? (
          <div className="ax-filterchips" role="group" aria-label="Filter by status">
            <button type="button" className="ax-fchip" aria-pressed={!filter} onClick={() => setFilter(null)}>
              All <span className="ax-fchip__n">{leads.length}</span>
            </button>
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="ax-fchip"
                aria-pressed={filter === s}
                onClick={() => setFilter(filter === s ? null : s)}
              >
                {LABEL[s]} <span className="ax-fchip__n">{leads.filter((l) => statusOf(l) === s).length}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="ax-seg ax-viewtoggle" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === "list"} className="ax-seg__opt" onClick={() => pickView("list")}>
            <List size={15} aria-hidden="true" /> List
          </button>
          <button type="button" role="radio" aria-checked={view === "board"} className="ax-seg__opt" onClick={() => pickView("board")}>
            <KanbanSquare size={15} aria-hidden="true" /> Board
          </button>
        </div>
        <Link
          href={archived ? "/admin/leads" : "/admin/leads?view=archived"}
          className="ax-btn"
          data-variant="ghost"
          prefetch={false}
        >
          {archived ? "Back to working list" : "Archived"}
        </Link>
      </div>

      {!leads.length ? (
        <EmptyState
          title={
            archived
              ? "Nothing archived."
              : "No leads yet. The enquiry form and booked calls land here."
          }
        />
      ) : view === "list" ? (
        shown.length ? (
          <ul className="ax-list" aria-label="Leads">
            {shown.map((lead) => (
              <li key={lead.id} className="ax-list__row ax-leadrow">
                <button type="button" className="ax-list__main" onClick={() => openLead(lead.id)}>
                  <span className="ax-avatar" aria-hidden="true">
                    {lead.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="ax-list__text">
                    <span className="ax-list__title">
                      {lead.name}
                      {lead.origin === "booking" ? <span className="ax-tag">Booked call</span> : null}
                    </span>
                    <span className="ax-list__sub">
                      {[lead.company, lead.platform, lead.source ? `${lead.source}${lead.medium ? ` / ${lead.medium}` : ""}` : null]
                        .filter(Boolean)
                        .join(" · ") || lead.email}
                    </span>
                    {problemOf(lead) ? <span className="ax-leadrow__msg">{problemOf(lead)}</span> : null}
                  </span>
                </button>
                <span className="ax-list__meta">
                  <LeadPill status={statusOf(lead)} />
                  <span className="ax-list__date">{when(lead.created_at)}</span>
                </span>
                <StatusSelect lead={lead} value={statusOf(lead)} onChange={(next) => void change(lead, next)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="ax-empty">
            <p className="ax-empty__title">Nothing matches.</p>
            <button type="button" className="ax-btn" onClick={() => { setQuery(""); setFilter(null); }}>
              Clear search and filters
            </button>
          </div>
        )
      ) : (
        <div className="ax-board" aria-label="Leads by status">
          {LEAD_STATUSES.map((column) => {
            const cards = shown.filter((lead) => statusOf(lead) === column);
            return (
              <section
                key={column}
                className="ax-board__col"
                data-over={overColumn === column || undefined}
                aria-label={`${LABEL[column]}, ${cards.length}`}
                onDragOver={(event) => {
                  if (!dragId) return;
                  event.preventDefault();
                  setOverColumn(column);
                }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setOverColumn(null);
                  const lead = leads.find((l) => l.id === dragId);
                  setDragId(null);
                  if (lead) void change(lead, column);
                }}
              >
                <header className="ax-board__head">
                  <LeadPill status={column} />
                  <span className="ax-board__n">{cards.length}</span>
                </header>
                <ul className="ax-board__cards">
                  {cards.map((lead) => (
                    <li
                      key={lead.id}
                      className="ax-card"
                      draggable
                      data-dragging={dragId === lead.id || undefined}
                      onDragStart={(event) => {
                        setDragId(lead.id);
                        event.dataTransfer.setData("text/plain", lead.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                    >
                      <button type="button" className="ax-card__open" onClick={() => openLead(lead.id)}>
                        <span className="ax-card__name">{lead.name}</span>
                        <span className="ax-card__sub">{lead.company ?? lead.email}</span>
                        {problemOf(lead) ? <span className="ax-card__msg">{problemOf(lead)}</span> : null}
                        <span className="ax-card__date">{when(lead.created_at)}</span>
                      </button>
                      <StatusSelect lead={lead} value={statusOf(lead)} onChange={(next) => void change(lead, next)} />
                    </li>
                  ))}
                  {!cards.length ? <li className="ax-board__empty">Drop a lead here</li> : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {open ? <LeadDrawer lead={open} status={statusOf(open)} onStatus={(next) => void change(open, next)} onClose={closeLead} /> : null}
    </>
  );
}

function LeadDrawer({
  lead,
  status,
  onStatus,
  onClose,
}: {
  lead: LeadRow;
  status: LeadStatus;
  onStatus: (next: LeadStatus) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const answers = Object.entries((lead.answers ?? {}) as Record<string, unknown>).filter(
    ([, value]) => typeof value === "string" && value.trim(),
  ) as [string, string][];
  const clickIds = (
    [
      ["gclid", lead.gclid],
      ["wbraid", lead.wbraid],
      ["gbraid", lead.gbraid],
      ["fbclid", lead.fbclid],
      ["ttclid", lead.ttclid],
      ["msclkid", lead.msclkid],
      ["li_fat_id", lead.li_fat_id],
    ] as const
  ).filter(([, value]) => Boolean(value));

  const saveNotes = async () => {
    setSaving(true);
    const result = await saveLeadNotes(lead.id, notes);
    setSaving(false);
    toast({ message: result.message, tone: result.status === "error" ? "error" : "ok" });
    if (result.status !== "error") router.refresh();
  };

  const attribution =
    lead.attribution_status === "captured" ? "Captured" : lead.attribution_status === "direct" ? "Direct" : "Not captured";

  return (
    <Drawer open onClose={onClose} title={lead.name} wide>
      <div className="ax-tabpanel">
        <div className="ax-leadhead">
          <div>
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
            <p className="ax-field__hint">
              {[lead.company, lead.platform, when(lead.created_at)].filter(Boolean).join(" · ")}
            </p>
            {lead.origin === "booking" && lead.booked_at ? (
              <p className="ax-field__hint">
                Booked a call {when(lead.booked_at)}
                {lead.canceled_at ? `, cancelled ${when(lead.canceled_at)}` : ""}
              </p>
            ) : null}
          </div>
          <StatusSelect lead={lead} value={status} onChange={onStatus} />
        </div>

        <section className="ax-group">
          <h3 className="ax-group__title">Message</h3>
          {answers.length ? (
            <dl className="ax-dl">
              {answers.map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/_/g, " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="ax-field__hint">No message.</p>
          )}
        </section>

        <section className="ax-group">
          <h3 className="ax-group__title">
            Source <span className="ax-tag">{attribution}</span>
          </h3>
          {lead.attribution_status === "unknown" ? (
            <p className="ax-field__hint">Nothing was observed for this visitor. That is a capture failure, not direct traffic.</p>
          ) : (
            <div className="ax-table__wrap">
              <table className="ax-table__table">
                <caption className="sr-only">Attribution for this lead</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Field</span>
                    </th>
                    <th scope="col">First touch</th>
                    <th scope="col">Last touch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Source / medium</th>
                    <td className="admin-mono">{[lead.source, lead.medium].filter(Boolean).join(" / ") || "none"}</td>
                    <td className="admin-mono">{[lead.last_touch_source, lead.last_touch_medium].filter(Boolean).join(" / ") || "none"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Campaign</th>
                    <td className="admin-mono">{lead.campaign ?? "none"}</td>
                    <td className="admin-mono">{lead.last_touch_campaign ?? "none"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Term / content</th>
                    <td className="admin-mono">{[lead.term, lead.content].filter(Boolean).join(" / ") || "none"}</td>
                    <td className="admin-mono">none</td>
                  </tr>
                  <tr>
                    <th scope="row">Landing page</th>
                    <td className="admin-mono">{lead.landing_page ?? "none"}</td>
                    <td className="admin-mono">{lead.last_landing_page ?? "none"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Referrer</th>
                    <td className="admin-mono">{lead.referrer ?? "none"}</td>
                    <td className="admin-mono">{lead.last_referrer ?? "none"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Click ids</th>
                    <td className="admin-mono" colSpan={2}>
                      {clickIds.length ? clickIds.map(([name, value]) => <div key={name}>{name}={value}</div>) : "none"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">First seen</th>
                    <td className="admin-mono" colSpan={2}>
                      {when(lead.first_seen_at) || "none"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="ax-group">
          <h3 className="ax-group__title">Notes</h3>
          <label className="ax-field">
            <span className="sr-only">Notes on {lead.name}</span>
            <textarea className="ax-input ax-textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div>
            <button type="button" className="ax-btn" data-variant="primary" disabled={saving} onClick={() => void saveNotes()}>
              {saving ? "Saving..." : "Save notes"}
            </button>
          </div>
        </section>

        <section className="ax-group">
          <h3 className="ax-group__title">Archive or erase</h3>
          <p className="ax-field__hint">Archive hides it and keeps everything. Erase removes it and its click ids for good.</p>
          <div className="admin-leadactions">
            <SavingForm
              action={archiveLead}
              className="admin-inline-form"
              submitLabel={lead.archived_at ? "Restore" : "Archive"}
              pendingLabel={lead.archived_at ? "Restoring..." : "Archiving..."}
              variant="ghost"
            >
              <input type="hidden" name="id" value={lead.id} />
              {lead.archived_at ? <input type="hidden" name="restore" value="on" /> : null}
            </SavingForm>
            <DeleteButton action={eraseLead} id={lead.id} label="Erase" />
          </div>
        </section>
      </div>
    </Drawer>
  );
}
