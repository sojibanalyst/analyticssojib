"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

/**
 * Tags and skills as chips. Type and press Enter or comma to add; Backspace in
 * an empty box removes the last; each chip has its own remove button.
 *
 * Inside a form it also writes a hidden input named `name`, comma separated,
 * so a server action reads it the same way it read the old text field.
 */
export function ChipInput({
  label,
  name,
  value,
  onChange,
  placeholder = "Type and press Enter",
}: {
  label: string;
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !value.some((v) => v.toLowerCase() === part.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };

  return (
    <div className="ax-field">
      <label htmlFor={id} className="ax-field__label">
        {label}
      </label>
      <div className="ax-chips">
        {value.map((chip) => (
          <span key={chip} className="ax-chip">
            {chip}
            <button
              type="button"
              className="ax-chip__x"
              aria-label={`Remove ${chip}`}
              onClick={() => onChange(value.filter((v) => v !== chip))}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="ax-chips__input"
          value={draft}
          placeholder={value.length ? "" : placeholder}
          onChange={(event) => {
            const next = event.target.value;
            if (next.includes(",")) add(next);
            else setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {name ? <input type="hidden" name={name} value={value.join(", ")} /> : null}
    </div>
  );
}
