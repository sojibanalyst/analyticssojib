"use client";

import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { Drawer } from "@/components/admin/ui/Drawer";

export type EditorTab = { key: string; label: string; content: React.ReactNode; badge?: string };

/**
 * The edit drawer: tabs (Content, Media, Settings), and a Save bar pinned to
 * the bottom. Ctrl+S (Cmd+S) saves. With unsaved changes, closing asks first
 * and leaving the page asks the browser's own question.
 */
export function EditorDrawer({
  open,
  title,
  tabs,
  dirty,
  saving,
  onSave,
  onClose,
  status,
  saveLabel = "Save changes",
}: {
  open: boolean;
  title: string;
  tabs: EditorTab[];
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  /** A short line beside the Save button: "Unsaved changes", "All changes saved". */
  status?: string;
  /** "Save changes", or "Add review" for a new item. */
  saveLabel?: string;
}) {
  const [tab, setTab] = useState(tabs[0]?.key ?? "");
  const [asking, setAsking] = useState(false);
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onSave]);

  useEffect(() => {
    if (!open || !dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [open, dirty]);

  const requestClose = () => {
    if (dirty) {
      setAsking(true);
      return false;
    }
    onClose();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={title}
        wide
        footer={
          <>
            <span className="ax-savebar__status" aria-live="polite">
              {status ?? (dirty ? "Unsaved changes" : "")}
            </span>
            <button type="button" className="ax-btn" onClick={() => requestClose()}>
              Close
            </button>
            <button
              type="button"
              className="ax-btn"
              data-variant="primary"
              onClick={onSave}
              disabled={saving}
              aria-busy={saving || undefined}
            >
              {saving ? "Saving..." : saveLabel}
            </button>
          </>
        }
      >
        {tabs.length > 1 ? (
          <div className="ax-tabs" role="tablist" aria-label="Sections">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active?.key === t.key}
                aria-controls={`panel-${t.key}`}
                className="ax-tab"
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.badge ? <span className="ax-tab__badge">{t.badge}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        {active ? (
          <div
            role={tabs.length > 1 ? "tabpanel" : undefined}
            id={`panel-${active.key}`}
            aria-labelledby={tabs.length > 1 ? `tab-${active.key}` : undefined}
            className="ax-tabpanel"
          >
            {active.content}
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={asking}
        title="Discard unsaved changes?"
        body="What you typed since the last save will be lost."
        confirmLabel="Discard changes"
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onClose();
        }}
      />
    </>
  );
}
