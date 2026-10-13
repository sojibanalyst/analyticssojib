"use client";

import { useId, useState } from "react";

import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { trackingCheck as copy } from "@/content/site";
import { track } from "@/lib/track";
import type { CheckResult } from "@/lib/tracking-check";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; host: string; results: CheckResult[] }
  | { status: "error"; message: string };

/**
 * The free tracking check: a URL in, four lines out.
 *
 * It asks this site's own route to fetch the page and look for a GTM
 * container, GA4, the Meta pixel and a consent tool in its HTML. The result is
 * worded as what was or was not FOUND IN THE PAGE SOURCE, because that is all
 * it knows: a tag loaded later by a tag manager is invisible to it, and the
 * panel says so before and after.
 *
 * The URL goes to the route and nowhere else. The event this fires,
 * tracking_check_run, carries how many of the four were found and not which
 * site was checked.
 *
 * The result region is a live region, so a screen reader hears the outcome
 * without having to go looking for it.
 */
export function TrackingCheck() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [value, setValue] = useState("");
  const inputId = useId();
  const noteId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "loading" || !value.trim()) return;
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/tracking-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const body = (await response.json()) as
        | { ok: true; host: string; results: CheckResult[] }
        | { ok: false; error: keyof typeof copy.errors };

      if (!body.ok) {
        setState({ status: "error", message: copy.errors[body.error] ?? copy.errors.unreachable });
        return;
      }

      setState({ status: "done", host: body.host, results: body.results });
      track("tracking_check_run", { found: body.results.filter((r) => r.found).length });
    } catch {
      setState({ status: "error", message: copy.errors.unreachable });
    }
  }

  return (
    <section id="check" className="section section--raised check" aria-labelledby="check-title">
      <div className="check__intro">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h2 id="check-title" className="h2">
          {copy.title}
        </h2>
        <p className="check__body">{copy.body}</p>
      </div>

      <div className="check__panel">
        <form className="check__form" onSubmit={onSubmit} noValidate>
          <label className="check__label" htmlFor={inputId}>
            {copy.label}
          </label>
          <div className="check__row">
            <input
              id={inputId}
              className="check__input"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={copy.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby={noteId}
              maxLength={2048}
            />
            {/* Not styled as .btn: that would also fire a cta_click, and this
                press is already counted by tracking_check_run. */}
            <button className="check__submit" type="submit" disabled={state.status === "loading"}>
              {state.status === "loading" ? copy.checking : copy.submit}
            </button>
          </div>
          <p id={noteId} className="check__note">
            {copy.note}
          </p>
        </form>

        <div className="check__result" role="status" aria-live="polite">
          {state.status === "error" && <p className="check__error">{state.message}</p>}

          {state.status === "done" && (
            <>
              <p className="check__host">
                {copy.resultFor} <code>{state.host}</code>
              </p>
              <ul className="check__list">
                {state.results.map((result) => (
                  <li key={result.id} className="check__item" data-found={result.found}>
                    <span className="check__mark" aria-hidden="true">
                      {result.found ? "✓" : "?"}
                    </span>
                    <span className="check__name">{copy.names[result.id]}</span>
                    <span className="check__state">
                      {result.found ? copy.found : copy.notFound}
                      {result.evidence ? <code> {result.evidence}</code> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="check__disclaimer">{copy.disclaimer}</p>
              <CalendlyPopupButton className="btn btn-primary" placement="tracking-check">
                {copy.cta}
              </CalendlyPopupButton>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
