"use client";

import { useEffect, useRef } from "react";

/**
 * "Delete this?" with the item named, on the native <dialog>. The safe choice
 * (Cancel) has focus when it opens, so Enter does not delete by accident.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra controls between the text and the buttons, such as a checkbox. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ax-confirm"
      aria-labelledby="ax-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="ax-confirm-title" className="ax-confirm__title">
        {title}
      </h2>
      {body ? <p className="ax-confirm__body">{body}</p> : null}
      {children}
      <div className="ax-confirm__actions">
        <button ref={cancelRef} type="button" className="ax-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="ax-btn"
          data-variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
