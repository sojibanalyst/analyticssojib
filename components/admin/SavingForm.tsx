"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/admin/ui/Toast";
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
 *   - the result arrives as a toast (announced to screen readers), and stays
 *     as a line under the button
 *   - the result is the action's own return value, not an assumption that
 *     submitting means succeeding
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
  const toast = useToast();

  // Every result also arrives as a toast, which is what is announced; the line
  // under the button stays as the visible record beside the form.
  useEffect(() => {
    if (state.status !== "idle") toast({ message: state.message, tone: state.status === "error" ? "error" : "ok" });
  }, [state, toast]);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="admin-formfoot">
        <SubmitButton
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          variant={variant}
        />
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/**
 * The result line.
 *
 * It goes quiet while a submit is in flight. Without that, resubmitting leaves
 * the previous "Saved." on screen beside a button reading "Saving…", which
 * reads as a result for the save currently running. React holds the old state
 * until the new action resolves — correct behaviour, but not something to
 * show.
 *
 * A non-breaking space when idle, so the row keeps its height and the layout
 * does not jump the first time a message appears.
 */
function FormStatus({ state }: { state: ActionState }) {
  const { pending } = useFormStatus();
  const showing = !pending && state.status !== "idle";
  const failed = state.status === "error";

  return (
    <p
      className="admin-formstatus"
      data-state={showing ? (failed ? "error" : "ok") : "idle"}
    >
      {showing ? (
        <>
          {/* Colour alone is not a distinction: it fails for anyone who
              cannot separate red from green, and it vanishes in a mono
              screenshot. The mark and the tinted pill carry it too. The mark
              is aria-hidden so a screen reader gets the sentence rather than
              "check mark". */}
          <span className="admin-formstatus__mark" aria-hidden="true">
            {failed ? "✕" : "✓"}
          </span>
          {state.message}
        </>
      ) : (
        " "
      )}
    </p>
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
