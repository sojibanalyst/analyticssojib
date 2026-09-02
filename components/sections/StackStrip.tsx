import { stack } from "@/content/site";
import { StackIcon } from "@/components/ui/Icon";

/**
 * The tools band, full-bleed and moving.
 *
 * The "STACK /" label is gone. On a band that now runs to the edge of the
 * screen it sat cramped against the left margin, and a row of named tool marks
 * does not need to be told what it is.
 *
 * The set is rendered TWICE. The second copy is aria-hidden and exists only so
 * the marquee has something to run into — translating the pair by exactly -50%
 * lands the copy where the original started, which is what makes the loop
 * seamless rather than a jump. Under reduced motion the copy is display:none
 * and the row goes back to being a plain scrollable line, so nobody is read
 * the same twelve tools twice.
 */
function StackSet({ copy = false }: { copy?: boolean }) {
  return (
    <div
      className={copy ? "stack-strip__set stack-strip__set--copy" : "stack-strip__set"}
      aria-hidden={copy || undefined}
    >
      {stack.map((item) => (
        <span key={item.label} className="stack-strip__item">
          <StackIcon item={item} />
          <span className="stack-strip__label">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function StackStrip() {
  return (
    <section
      aria-label="Tools and platforms"
      className="section section--band section--raised stack-strip"
    >
      <div className="stack-strip__row">
        <div className="stack-strip__marquee">
          <StackSet />
          <StackSet copy />
        </div>
      </div>
    </section>
  );
}
