import { stack } from "@/content/site";
import { StackIcon } from "@/components/ui/Icon";

export function StackStrip() {
  return (
    <section
      aria-label="Tools and platforms"
      className="section section--band section--raised"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px 22px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            flex: "0 0 auto",
            fontFamily: "var(--font-prose)",
            fontSize: "var(--text-label)",
            letterSpacing: "0.14em",
            color: "var(--ink)",
          }}
        >
          STACK /
        </span>
        {stack.map((item) => (
          <span
            key={item.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              flex: "0 0 auto",
            }}
          >
            <StackIcon item={item} />
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
