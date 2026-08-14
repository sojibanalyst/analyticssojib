"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ACTION_IDLE, type ActionState } from "@/lib/action-state";

/**
 * A form that tells you what happened.
 *
 * Every admin form was a Server Action that revalidated and said nothing. The
 * fields render identically before and after a successful save, so the only
 * feedback was the page not changing — which is indistinguishable from a
 * broken button, and people clicked Save twice.
 *
 * Three things fix that, and all three are needed:
 *   - the button disables and reads "Saving…" while the action is in flight
 *   - a status line announces the result through role="status"/aria-live, so
 *     it reaches a screen reader as well as an eye
 *   - the result is the action's own return value, not an assumption that
 *     submitting means succeeding
 *
 * The status line keeps its height when idle (a non-breaking space) so the
 * layout does not jump the first time a message appears.
 */
export function SavingForm({
  action,
  children,
  className = "admin-form",
  submitLabel = "Save",
  pendingLabel = "Saving…",
  variant,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
  pendingLabel?: string;
  /** "danger" for destructive actions; matches .admin-button[data-variant]. */
  variant?: "ghost" | "danger";
}) {
  const [state, formAction] = useActionState(action, ACTION_IDLE);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="admin-formfoot">
        <SubmitButton
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          variant={variant}
        />
        <p
          className="admin-note admin-formstatus"
          data-tone={state.status === "error" ? "danger" : state.status === "ok" ? "success" : undefined}
          role="status"
          aria-live="polite"
        >
          {state.status === "idle" ? " " : state.message}
        </p>
      </div>
    </form>
  );
}

/**
 * Split out because useFormStatus only reports on the form ABOVE it in the
 * tree — called in the same component that renders the <form>, it always
 * returns pending: false.
 */
function SubmitButton({
  submitLabel,
  pendingLabel,
  variant,
}: {
  submitLabel: string;
  pendingLabel: string;
  variant?: "ghost" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="admin-button"
      data-variant={variant}
      disabled={pending}
      // Tells assistive tech the control is working rather than ignoring the
      // click; the visible label change only helps people who can see it.
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel : submitLabel}
    </button>
  );
}
