"use client";

import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, Skeleton } from "@/components/admin/ui/Basics";

export type Column<Row> = {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
  /** A value to sort by. Columns without one are not sortable. */
  sortValue?: (row: Row) => string | number;
  /** Mono and right-aligned: counts, ids, times. */
  numeric?: boolean;
  /** Hidden below 760px, so a phone keeps the columns that matter. */
  hideOnPhone?: boolean;
};

export type Filter<Row> = { key: string; label: string; test: (row: Row) => boolean };

/**
 * The console's list: a search box, filter chips, sortable columns, an empty
 * state that says what to do, and a skeleton while loading.
 *
 * The rows arrive from the server already fetched; searching, filtering and
 * sorting happen here, in the browser, so they are instant and change no
 * query. A filtered-to-nothing list says so and offers to clear the filter,
 * which is different from a list that is truly empty.
 */
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  searchText,
  searchLabel = "Search",
  filters = [],
  empty,
  loading = false,
  initialSort,
  rowActions,
}: {
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  caption: string;
  /** The text a row is searched by. Without it there is no search box. */
  searchText?: (row: Row) => string;
  searchLabel?: string;
  filters?: Filter<Row>[];
  empty: { title: string; action?: { label: string; href: string } };
  loading?: boolean;
  initialSort?: { key: string; dir: "asc" | "desc" };
  /** A last column of per-row buttons or a menu. */
  rowActions?: (row: Row) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState(initialSort ?? null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = filters.find((f) => f.key === filter);
    let list = rows.filter(
      (row) => (!q || (searchText?.(row) ?? "").toLowerCase().includes(q)) && (!active || active.test(row)),
    );
    const column = sort && columns.find((c) => c.key === sort.key);
    if (sort && column?.sortValue) {
      const get = column.sortValue;
      list = [...list].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? order : -order;
      });
    }
    return list;
  }, [rows, query, filter, sort, filters, columns, searchText]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  if (loading) return <Skeleton rows={8} label={`Loading ${caption}`} />;

  if (!rows.length) return <EmptyState title={empty.title} action={empty.action} />;

  return (
    <div className="ax-table">
      {searchText || filters.length ? (
        <div className="ax-table__tools">
          {searchText ? (
            <label className="ax-search">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">{searchLabel}</span>
              <input
                type="search"
                value={query}
                placeholder={searchLabel}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          {filters.length ? (
            <div className="ax-filterchips" role="group" aria-label="Filter">
              <button type="button" className="ax-fchip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
                All <span className="ax-fchip__n">{rows.length}</span>
              </button>
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="ax-fchip"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(filter === f.key ? null : f.key)}
                >
                  {f.label} <span className="ax-fchip__n">{rows.filter(f.test).length}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {shown.length} of {rows.length} shown
      </p>

      {shown.length ? (
        <div className="ax-table__wrap">
          <table className="ax-table__table">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    data-numeric={column.numeric || undefined}
                    data-phone={column.hideOnPhone ? "hide" : undefined}
                    aria-sort={
                      sort?.key === column.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    {column.sortValue ? (
                      <button type="button" className="ax-sort" onClick={() => toggleSort(column.key)}>
                        {column.header}
                        {sort?.key === column.key ? (
                          sort.dir === "asc" ? (
                            <ArrowUp size={13} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={13} aria-hidden="true" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
                {rowActions ? (
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-numeric={column.numeric || undefined}
                      data-phone={column.hideOnPhone ? "hide" : undefined}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {rowActions ? <td className="ax-table__actions">{rowActions(row)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ax-empty">
          <p className="ax-empty__title">Nothing matches.</p>
          <button
            type="button"
            className="ax-btn"
            onClick={() => {
              setQuery("");
              setFilter(null);
            }}
          >
            Clear search and filters
          </button>
        </div>
      )}
    </div>
  );
}
