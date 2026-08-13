"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitLead, type LeadState } from "@/app/(marketing)/actions";
import { leadForm as copy } from "@/content/site";
import { track } from "@/lib/track";

const initial: LeadState = { status: "idle", message: "" };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary lead-form__submit" disabled={pending}>
      {pending ? copy.sending : copy.submit}
    </button>
  );
}

/**
 * The enquiry form.
 *
 * A real <form> with a Server Action, so it submits with JavaScript disabled —
 * the tracking is the part that needs JS, not the ability to reach me. Fields
 * beyond name and email are optional on purpose: every required field is a
 * reason not to bother.
 */
export function LeadForm() {
  const [state, formAction] = useActionState(submitLead, initial);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const fired = useRef<string | null>(null);

  // generate_lead fires once the server confirms the row, not on click. A
  // conversion counted before it happened is the same lie as one counted
  // twice, and this is the event the whole site exists to produce.
  useEffect(() => {
    if (state.status !== "sent") return;
    const key = state.eventId ?? "sent";
    if (fired.current === key) return;
    fired.current = key;
    track("generate_lead", { form: "contact" });
  }, [state]);

  if (state.status === "sent") {
    return (
      <div className="lead-form lead-form--done" role="status">
        <p className="lead-form__title">{copy.doneTitle}</p>
        <p className="lead-form__note">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="lead-form">
      <p className="lead-form__title">{copy.title}</p>
      <p className="lead-form__note">{copy.body}</p>

      {/* Honeypot: off-screen, not announced, and never focusable by tab. */}
      <div aria-hidden="true" className="lead-form__trap">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="lead-form__row">
        <div className="lead-form__field">
          <label htmlFor="lead-name">{copy.name}</label>
          <input id="lead-name" name="name" required autoComplete="name" />
        </div>
        <div className="lead-form__field">
          <label htmlFor="lead-email">{copy.email}</label>
          <input id="lead-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>

      <div className="lead-form__row">
        <div className="lead-form__field">
          <label htmlFor="lead-company">{copy.company}</label>
          <input id="lead-company" name="company" autoComplete="organization" />
        </div>
        <div className="lead-form__field">
          <label htmlFor="lead-platform">{copy.platform}</label>
          <select id="lead-platform" name="platform" defaultValue="">
            <option value="">{copy.platformDefault}</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="custom">Custom build</option>
            <option value="other">Something else</option>
          </select>
        </div>
      </div>

      <div className="lead-form__field">
        <label htmlFor="lead-problem">{copy.problem}</label>
        <textarea id="lead-problem" name="problem" rows={3} />
      </div>

      <Submit />

      <p
        ref={statusRef}
        className="lead-form__note"
        data-tone={state.status === "error" ? "danger" : undefined}
        role="status"
        aria-live="polite"
      >
        {state.status === "error" ? state.message : copy.privacy}
      </p>
    </form>
  );
}
