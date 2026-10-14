"use client";

import { GripVertical, ImageOff, Search, Star } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import {
  deleteItem,
  duplicateItem,
  reorderItems,
  saveItem,
  setVisibility,
} from "@/app/(admin)/admin/(console)/content-actions";
import { EditorDrawer } from "@/components/admin/content/EditorDrawer";
import {
  draftTitle,
  editorTabs,
  emptyDraft,
  toDraft,
  toListItem,
  type AnyRow,
  type ListItem,
} from "@/components/admin/content/kinds";
import { RowMenu } from "@/components/admin/content/RowMenu";
import { EmptyState, StatusBadge, Switch } from "@/components/admin/ui/Basics";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ui/Toast";
import type { ContentKind, Draft } from "@/lib/admin/editor";

type FilterKey = "all" | "live" | "notLive" | "check" | "noImages";
type SortKey = "order" | "title" | "updated";

const NOUN: Record<ContentKind, { one: string; many: string; add: string }> = {
  "case-studies": { one: "case study", many: "case studies", add: "Add case study" },
  portfolio: { one: "project", many: "projects", add: "Add project" },
  reviews: { one: "review", many: "reviews", add: "Add review" },
  posts: { one: "post", many: "posts", add: "Add post" },
  faqs: { one: "question", many: "questions", add: "Add question" },
};

/**
 * One pattern for every content screen: a list, then an editor.
 *
 * THE LIST: thumbnail, title, status, last updated, and for projects the
 * image count. Search, filter chips and sort run here in the browser. Each row
 * has a Show switch (applied at once, with Undo), a drag handle, and a menu:
 * Edit, Duplicate, View on site, Move up, Move down, Delete.
 *
 * ORDER is the order on the site. Drag a row by its handle, or use Move up and
 * Move down from the menu (the keyboard way). Reordering is only offered while
 * the list shows everything in site order, so a filtered or sorted view can
 * never write a partial order.
 *
 * THE EDITOR opens from ?edit=<id> or ?new=1, so a row, the top bar's "New"
 * button and the command palette all open it the same way, and the back
 * button closes it.
 */
export function ContentScreen({ kind, rows }: { kind: ContentKind; rows: AnyRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const noun = NOUN[kind];

  /* List state ------------------------------------------------------------ */

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("order");
  const [visibleOverride, setVisibleOverride] = useState<Record<string, boolean>>({});
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  // The order the server sent, unless a reorder is waiting for the refresh.
  const orderedRows = useMemo(() => {
    if (!orderOverride) return rows;
    const ids = new Set(rows.map((r) => r.id));
    const known = orderOverride.filter((id) => ids.has(id)).map((id) => byId.get(id)!);
    const rest = rows.filter((r) => !orderOverride.includes(r.id));
    return [...known, ...rest];
  }, [rows, orderOverride, byId]);

  const items = useMemo(
    () =>
      orderedRows.map((row) => {
        const item = toListItem(kind, row);
        const visible = visibleOverride[row.id] ?? item.visible;
        if (visible === item.visible) return item;
        return {
          ...item,
          visible,
          status: item.needsCheck && kind === "reviews" ? item.status : visible ? "published" : kind === "case-studies" ? "draft" : "hidden",
        } as ListItem;
      }),
    [orderedRows, kind, visibleOverride],
  );

  const filters: { key: FilterKey; label: string; test: (i: ListItem) => boolean }[] = [
    { key: "live", label: "Published", test: (i) => i.visible },
    { key: "notLive", label: kind === "case-studies" ? "Draft" : "Hidden or draft", test: (i) => !i.visible || i.status === "draft" },
    ...(items.some((i) => i.needsCheck)
      ? [{ key: "check" as const, label: "Needs check", test: (i: ListItem) => i.needsCheck }]
      : []),
    ...(kind === "portfolio" || kind === "case-studies"
      ? [{ key: "noImages" as const, label: "No images", test: (i: ListItem) => (i.imageCount ?? 0) === 0 }]
      : []),
  ];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = filters.find((f) => f.key === filter);
    let list = items.filter(
      (i) => (!q || `${i.title} ${i.subtitle ?? ""}`.toLowerCase().includes(q)) && (!active || active.test(i)),
    );
    if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "updated") list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
    // filters is rebuilt each render from items; its tests are pure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, filter, sort]);

  const canReorder = !query && filter === "all" && sort === "order";

  /* Actions ---------------------------------------------------------------- */

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const toggleVisible = async (item: ListItem, next: boolean) => {
    setVisibleOverride((o) => ({ ...o, [item.id]: next }));
    const result = await setVisibility(kind, item.id, next);
    if (!result.ok) {
      setVisibleOverride((o) => ({ ...o, [item.id]: !next }));
      toast({ message: result.message, tone: "error" });
      return;
    }
    toast({
      message: result.message,
      undo: async () => {
        setVisibleOverride((o) => ({ ...o, [item.id]: !next }));
        const back = await setVisibility(kind, item.id, !next);
        if (back.ok) refresh();
        else toast({ message: back.message, tone: "error" });
      },
    });
    refresh();
  };

  const writeOrder = async (ids: string[], previous: string[]) => {
    setOrderOverride(ids);
    const result = await reorderItems(kind, ids);
    if (!result.ok) {
      setOrderOverride(previous);
      toast({ message: result.message, tone: "error" });
      return;
    }
    toast({
      message: result.message,
      undo: async () => {
        setOrderOverride(previous);
        const back = await reorderItems(kind, previous);
        if (back.ok) refresh();
      },
    });
    refresh();
  };

  const move = (id: string, by: number) => {
    const ids = items.map((i) => i.id);
    const at = ids.indexOf(id);
    const to = at + by;
    if (at < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(at, 1);
    next.splice(to, 0, id);
    void writeOrder(next, ids);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const next = ids.filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId) + (ids.indexOf(dragId) < ids.indexOf(targetId) ? 1 : 0), 0, dragId);
    setDragId(null);
    void writeOrder(next, ids);
  };

  const duplicate = async (item: ListItem) => {
    const result = await duplicateItem(kind, item.id);
    if (!result.ok) return toast({ message: result.message, tone: "error" });
    toast({ message: result.message });
    refresh();
    openEdit(result.id);
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    const result = await deleteItem(kind, confirmDelete.id);
    setBusy(false);
    setConfirmDelete(null);
    if (!result.ok) return toast({ message: result.message, tone: "error" });
    toast({ message: `Deleted "${confirmDelete.title}"` });
    refresh();
  };

  /* Editor ------------------------------------------------------------------ */

  const editId = params.get("edit");
  const isNew = params.get("new") === "1";
  const editing = editId ? byId.get(editId) : undefined;
  const open = isNew || !!editing;

  const openEdit = (id: string) => router.push(`${pathname}?edit=${id}`, { scroll: false });
  const close = () => router.push(pathname, { scroll: false });

  return (
    <>
      <div className="ax-table">
        <div className="ax-table__tools">
          <label className="ax-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search {noun.many}</span>
            <input
              type="search"
              value={query}
              placeholder={`Search ${noun.many}`}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="ax-filterchips" role="group" aria-label="Filter">
            <button type="button" className="ax-fchip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All <span className="ax-fchip__n">{items.length}</span>
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="ax-fchip"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(filter === f.key ? "all" : f.key)}
              >
                {f.label} <span className="ax-fchip__n">{items.filter(f.test).length}</span>
              </button>
            ))}
          </div>
          <label className="ax-sortsel">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="order">Site order</option>
              <option value="title">Title</option>
              <option value="updated">Last updated</option>
            </select>
          </label>
        </div>

        <p className="sr-only" aria-live="polite">
          {shown.length} of {items.length} shown
        </p>

        {!rows.length ? (
          <EmptyState
            title={`No ${noun.many} yet. Add your first one.`}
            action={{ label: noun.add, href: `${pathname}?new=1` }}
          />
        ) : !shown.length ? (
          <div className="ax-empty">
            <p className="ax-empty__title">Nothing matches.</p>
            <button
              type="button"
              className="ax-btn"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            {!canReorder ? (
              <p className="ax-hint">To change the order, clear the search and filters and sort by site order.</p>
            ) : null}
            <ul className="ax-list" aria-label={noun.many}>
              {shown.map((item, index) => (
                <li
                  key={item.id}
                  className="ax-list__row"
                  data-dragging={dragId === item.id || undefined}
                  draggable={canReorder && dragId === item.id}
                  onDragOver={(event) => {
                    if (dragId) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropOn(item.id);
                  }}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                  onDragEnd={() => setDragId(null)}
                >
                  {canReorder ? (
                    <span
                      className="ax-list__grip"
                      aria-hidden="true"
                      onPointerDown={() => setDragId(item.id)}
                      onPointerUp={() => setDragId(null)}
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </span>
                  ) : null}

                  <button type="button" className="ax-list__main" onClick={() => openEdit(item.id)}>
                    <span className="ax-list__thumb">
                      {item.thumb ? (
                        <Image src={item.thumb} alt="" width={72} height={46} sizes="72px" />
                      ) : (
                        <ImageOff size={16} aria-hidden="true" />
                      )}
                    </span>
                    <span className="ax-list__text">
                      <span className="ax-list__title">
                        {item.featured ? <Star size={13} aria-label="Featured" className="ax-list__star" /> : null}
                        {item.title}
                      </span>
                      {item.subtitle ? <span className="ax-list__sub">{item.subtitle}</span> : null}
                    </span>
                  </button>

                  <span className="ax-list__meta">
                    <StatusBadge status={item.status} />
                    {item.needsCheck && item.status !== "needs-check" ? <StatusBadge status="needs-check" /> : null}
                    {item.imageCount !== undefined ? (
                      <span className="ax-list__count" title="Images">
                        {item.imageCount} img
                      </span>
                    ) : null}
                    <span className="ax-list__date">{shortDate(item.updatedAt)}</span>
                  </span>

                  <Switch
                    hideLabel
                    label={`Show "${item.title}" on the site`}
                    checked={item.visible}
                    onChange={(next) => void toggleVisible(item, next)}
                  />

                  <RowMenu
                    label={`Actions for "${item.title}"`}
                    items={[
                      { label: "Edit", onSelect: () => openEdit(item.id) },
                      { label: "Duplicate", onSelect: () => void duplicate(item) },
                      ...(item.siteHref ? [{ label: "View on site", onSelect: () => {}, href: item.siteHref }] : []),
                      { label: "Move up", onSelect: () => move(item.id, -1), disabled: !canReorder || index === 0 },
                      {
                        label: "Move down",
                        onSelect: () => move(item.id, 1),
                        disabled: !canReorder || index === shown.length - 1,
                      },
                      { label: "Delete", onSelect: () => setConfirmDelete(item), danger: true },
                    ]}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {open ? (
        <Editor
          key={editing?.id ?? "new"}
          kind={kind}
          row={editing}
          onClose={close}
          onSaved={(id, created) => {
            refresh();
            if (created) router.replace(`${pathname}?edit=${id}`, { scroll: false });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        body="This removes it from the site and the console. It cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}

function shortDate(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The drawer for one item, or for a new one. Holds the draft and its errors. */
function Editor({
  kind,
  row,
  onClose,
  onSaved,
}: {
  kind: ContentKind;
  row?: AnyRow;
  onClose: () => void;
  onSaved: (id: string, created: boolean) => void;
}) {
  const toast = useToast();
  const initial = useMemo(() => (row ? toDraft(kind, row) : emptyDraft(kind)), [kind, row]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== saved;

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const result = await saveItem(kind, row?.id ?? null, draft);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.fields ?? {});
      toast({ message: result.message, tone: "error" });
      return;
    }
    setErrors({});
    setSaved(JSON.stringify(draft));
    toast({ message: result.message });
    onSaved(result.id, !row);
  }, [kind, row, draft, toast, onSaved]);

  const name = draftTitle(kind, draft);
  const title = row ? (name ? `Edit: ${name}` : `Edit ${NOUN[kind].one}`) : `New ${NOUN[kind].one}`;

  return (
    <EditorDrawer
      open
      title={title}
      tabs={editorTabs(kind, { draft, set, errors, raw: row })}
      dirty={dirty}
      saving={saving}
      onSave={() => void save()}
      onClose={onClose}
      status={dirty ? "Unsaved changes" : row ? "All changes saved" : ""}
      saveLabel={row ? "Save changes" : NOUN[kind].add}
    />
  );
}
