"use client";

import { useState } from "react";

/**
 * A write-only credential field.
 *
 * The server never sends the stored value, so there is nothing here to reveal
 * — this component could not display the secret if it wanted to. What it
 * shows instead is enough to answer "is the right credential loaded?": that
 * one is configured, its last four characters, and when it was last changed.
 *
 * Two states:
 *
 *   configured   a status line and a Replace button. The input only appears
 *                once Replace is pressed, so a stray keystroke on an
 *                unrelated save cannot touch the credential.
 *   not set      the input, immediately, because there is nothing to protect.
 *
 * Submitting an empty field leaves the stored secret alone. That is enforced
 * on the server too — set_destination_secret returns early on a blank value —
 * because a form that wipes a credential when you save an unrelated field is
 * a trap, not a feature.
 */
export function SecretField({
  name,
  label,
  help,
  last4,
  updatedAt,
  source,
  envVar,
}: {
  name: string;
  label: string;
  help: string;
  last4: string | null;
  updatedAt: string | null;
  /** Where the value the worker will actually use comes from. */
  source: "database" | "env" | "none";
  envVar: string;
}) {
  const configured = source !== "none";
  const [replacing, setReplacing] = useState(!configured);

  return (
    <div className="admin-field admin-secret">
      <label htmlFor={name}>{label}</label>

      {configured ? (
        <p className="admin-secret__status">
          <span className="admin-pill" data-tone="success">
            Configured
          </span>
          {source === "database" ? (
            <>
              <span aria-hidden="true">·</span>
              <code>••••{last4 ?? "????"}</code>
              {updatedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    updated{" "}
                    <time dateTime={updatedAt}>
                      {new Date(updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <>
              <span aria-hidden="true">·</span>
              {/* Worth distinguishing: a value set here can be rotated from
                  this screen, one from the environment cannot. */}
              <span>
                from <code>{envVar}</code> — set one here to override it
              </span>
            </>
          )}
        </p>
      ) : null}

      {replacing ? (
        <>
          <input
            id={name}
            name={name}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={configured ? "Paste the new value" : "Paste the value"}
            // No defaultValue, ever. There is nothing to prefill it with.
          />
          <p className="admin-note">
            {help} Leave blank to keep the current value.
          </p>
        </>
      ) : (
        <div className="admin-inline-form">
          <button
            type="button"
            className="admin-button"
            data-variant="ghost"
            onClick={() => setReplacing(true)}
          >
            Replace
          </button>
          <span className="admin-note">{help}</span>
        </div>
      )}
    </div>
  );
}
