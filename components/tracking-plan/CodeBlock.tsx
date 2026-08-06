"use client";

import { useState } from "react";

type Props = { label: string; code: string; lang: "js" | "text" };

export function CodeBlock({ label, code, lang }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the code
      // is selectable, so this is a silent no-op rather than an error state.
    }
  };

  return (
    <figure className="codeblock">
      <figcaption className="codeblock__bar">
        <span>
          {label}
          <span className="codeblock__lang">{lang === "js" ? "JAVASCRIPT" : "DIAGRAM"}</span>
        </span>
        <button type="button" onClick={copy} className="codeblock__copy">
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </figcaption>
      <pre className="codeblock__pre">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
