"use client";

import { useId } from "react";

/**
 * Form fields for the editor drawer. Each one has a visible label, an optional
 * one-line hint, and its error right under it, tied to the input with
 * aria-describedby and aria-invalid so a screen reader hears it on focus.
 */

type Base = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

function Wrap({
  id,
  label,
  hint,
  error,
  required,
  count,
  children,
}: Base & { id: string; count?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ax-field" data-invalid={error ? true : undefined}>
      <div className="ax-field__top">
        <label htmlFor={id} className="ax-field__label">
          {label}
          {required ? <span className="ax-field__req"> (required)</span> : null}
        </label>
        {count}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="ax-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="ax-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const described = (id: string, hint?: string, error?: string) =>
  [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
  ...base
}: Base & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url" | "number";
  mono?: boolean;
}) {
  const id = useId();
  return (
    <Wrap id={id} {...base}>
      <input
        id={id}
        className="ax-input"
        data-mono={mono || undefined}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={described(id, base.hint, base.error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </Wrap>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  softLimit,
  placeholder,
  ...base
}: Base & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  /** Shows a character count, and warns past this many. */
  softLimit?: number;
  placeholder?: string;
}) {
  const id = useId();
  const count =
    softLimit !== undefined ? (
      <span className="ax-field__count" data-over={value.length > softLimit || undefined} aria-live="polite">
        {value.length} / {softLimit}
      </span>
    ) : null;
  return (
    <Wrap id={id} count={count} {...base}>
      <textarea
        id={id}
        className="ax-input ax-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={described(id, base.hint, base.error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </Wrap>
  );
}

/** A small set of choices shown as one row of buttons. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="ax-field">
      <span className="ax-field__label" id={`seg-${label}`}>
        {label}
      </span>
      <div className="ax-seg" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className="ax-seg__opt"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Two fields side by side on wide screens, stacked on a phone. */
export function Row({ children }: { children: React.ReactNode }) {
  return <div className="ax-row">{children}</div>;
}

/** A labelled group inside a tab. */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="ax-group">
      <legend className="ax-group__title">{title}</legend>
      {children}
    </fieldset>
  );
}
