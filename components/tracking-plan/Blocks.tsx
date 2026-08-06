import type { Block } from "@/content/tracking-plan";
import { CodeBlock } from "@/components/tracking-plan/CodeBlock";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";

/**
 * Minimal inline formatter for the content strings: `code` and **bold**.
 * Deliberately not a markdown parser — these are the only two marks used, and
 * a parser would be a dependency for no gain.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={i} className="inline-code">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} style={{ color: "var(--text)", fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

/**
 * Tables carry `data-label` on every cell so the CSS can restack them as
 * definition-list cards on narrow screens instead of forcing a sideways scroll.
 */
function PlanTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="plan-table-wrap">
      <table className="plan-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} data-label={head[j]}>
                  <Rich text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.kind) {
    case "lead":
      return (
        <p className="plan-lead">
          <Rich text={block.text} />
        </p>
      );

    case "para":
      return (
        <p className="plan-para">
          <Rich text={block.text} />
        </p>
      );

    case "subhead":
      return (
        <h3 className="plan-subhead">
          <Rich text={block.text} />
        </h3>
      );

    case "note":
      return (
        <p className="plan-note">
          <Rich text={block.text} />
        </p>
      );

    case "list":
      return (
        <ul className="plan-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <Rich text={item} />
            </li>
          ))}
        </ul>
      );

    case "rules":
      return (
        <dl className="plan-rules">
          {block.items.map((item, i) => (
            <div key={i} className="plan-rules__row">
              <dt>
                <Rich text={item.term} />
              </dt>
              <dd>
                <Rich text={item.text} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return <PlanTable head={block.head} rows={block.rows} />;

    case "code":
      return <CodeBlock label={block.label} code={block.code} lang={block.lang} />;

    case "cta":
      return (
        <div className="plan-cta">
          <CalendlyPopupButton className="btn btn-primary" placement="tracking-plan-mid">
            BOOK A 30-MIN CALL
          </CalendlyPopupButton>
        </div>
      );
  }
}
