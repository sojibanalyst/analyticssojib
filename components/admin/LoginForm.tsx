"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestMagicLink, type LoginState } from "@/app/(admin)/admin/actions";

const initial: LoginState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-button" disabled={pending}>
      {pending ? "Sending…" : "Email me a link"}
    </button>
  );
}

/**
 * The whole sign-in surface: one field, one button.
 *
 * The response is deliberately the same whether or not the address is
 * allowlisted, so this form cannot be used to find out who the admin is.
 */
export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [state, formAction] = useActionState(requestMagicLink, initial);

  const error = state.status === "error" ? state.message : initialError;

  return (
    <form action={formAction} className="admin-card">
      <div className="admin-pagehead">
        <h1>Console</h1>
        <p>Sign in with a one-time link. No password to lose.</p>
      </div>

      <input type="hidden" name="next" value={next} />

      <div className="admin-field">
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          spellCheck={false}
          placeholder="you@example.com"
        />
      </div>

      <SubmitButton />

      {/* aria-live so the result is announced without moving focus. */}
      <p
        className="admin-note"
        data-tone={error ? "danger" : state.status === "sent" ? "success" : undefined}
        role="status"
        aria-live="polite"
      >
        {error ?? (state.status === "sent" ? state.message : " ")}
      </p>
    </form>
  );
}
