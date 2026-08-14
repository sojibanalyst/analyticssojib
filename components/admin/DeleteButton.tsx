"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { DeleteState } from "@/app/(admin)/admin/(console)/delete-state";

const initial: DeleteState = { status: "idle", message: "" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-button"
      data-variant="danger"
      disabled={pending}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

/**
 * Delete, behind a tick.
 *
 * Two layers, because one was not enough. `required` on the checkbox makes the
 * browser refuse to submit and say why — no round trip, works with the native
 * message the user already recognises. The server checks the tick again and
 * returns a reason, which is rendered here: previously it returned silently,
 * so an unticked delete looked exactly like a broken button.
 *
 * Deliberately not a confirm() dialog. The rest of this console works with
 * JavaScript disabled and that would have been the one thing that did not —
 * and with JS off, `required` still holds.
 */
export function DeleteButton({
  action,
  id,
  label,
}: {
  action: (prev: DeleteState, formData: FormData) => Promise<DeleteState>;
  id: string;
  label: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="admin-inline-form admin-danger">
      <input type="hidden" name="id" value={id} />
      <label className="admin-check">
        <input type="checkbox" name="confirm" required />
        Confirm
      </label>
      <Submit label={label} />
      {state.status === "error" ? (
        <p className="admin-note" data-tone="danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
