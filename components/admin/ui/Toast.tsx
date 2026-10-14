"use client";

import { Check, X, TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Tone = "ok" | "error";
type Toast = { id: number; message: string; tone: Tone; undo?: () => void };
type ToastInput = { message: string; tone?: Tone; undo?: () => void };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** How long a toast stays: longer when it offers Undo, so there is time to use it. */
const LIFE_MS = 3500;
const UNDO_LIFE_MS = 7000;

/**
 * Toasts for the console: "Saved", "Published", "Moved to hidden".
 *
 * One live region holds them all, so a screen reader hears each message once
 * as it arrives. Errors use role="alert". Undo, where offered, is a real
 * button, and the toast holds still while the pointer or focus is on it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number, ms: number) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  const push = useCallback(
    ({ message, tone = "ok", undo }: ToastInput) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-3), { id, message, tone, undo }]);
      schedule(id, undo ? UNDO_LIFE_MS : LIFE_MS);
    },
    [schedule],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ax-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="ax-toast"
            data-tone={toast.tone}
            role={toast.tone === "error" ? "alert" : undefined}
            onMouseEnter={() => clearTimeout(timers.current.get(toast.id))}
            onMouseLeave={() => schedule(toast.id, LIFE_MS)}
            onFocus={() => clearTimeout(timers.current.get(toast.id))}
            onBlur={() => schedule(toast.id, LIFE_MS)}
          >
            <span className="ax-toast__mark" aria-hidden="true">
              {toast.tone === "error" ? <TriangleAlert size={16} /> : <Check size={16} />}
            </span>
            <span className="ax-toast__msg">{toast.message}</span>
            {toast.undo ? (
              <button
                type="button"
                className="ax-toast__undo"
                onClick={() => {
                  toast.undo?.();
                  dismiss(toast.id);
                }}
              >
                Undo
              </button>
            ) : null}
            <button
              type="button"
              className="ax-iconbtn ax-toast__close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Show a toast. Outside a provider it does nothing rather than throwing. */
export function useToast() {
  return useContext(ToastContext);
}
