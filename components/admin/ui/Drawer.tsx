"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * A side panel on wide screens and a full page on phones, built on the native
 * <dialog>: focus is trapped inside while it is open, Escape closes it, and
 * focus goes back to whatever opened it. The slide is a transform and does not
 * run under reduced motion.
 *
 * `onClose` is asked before closing; return false to keep it open (for an
 * unsaved-changes check).
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void | boolean;
  title: string;
  children: React.ReactNode;
  /** Pinned to the bottom: the Save bar. */
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (onClose() === false) return;
  };

  return (
    <dialog
      ref={ref}
      className="ax-drawer"
      data-wide={wide || undefined}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="ax-drawer__panel">
        <header className="ax-drawer__head">
          <h2 className="ax-drawer__title">{title}</h2>
          <button type="button" className="ax-iconbtn" aria-label="Close" onClick={requestClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="ax-drawer__body">{children}</div>
        {footer ? <footer className="ax-drawer__foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
