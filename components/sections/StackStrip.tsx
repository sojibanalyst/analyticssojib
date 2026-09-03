import { stack } from "@/content/site";
import { StackIcon } from "@/components/ui/Icon";

/**
 * The tools band.
 *
 * This was a full-bleed marquee and the marquee was a mistake. A loop needs
 * two copies of the set to run seamlessly, and with only twelve tools the set
 * is narrower than a desktop viewport — so both copies were on screen at once
 * and every tool appeared twice. Sojib spotted it before I did.
 *
 * So: one set, centred inside the page measure, wrapping instead of running.
 * The movement it lost comes back as an arrival — each tool fades and scales
 * up in sequence when the band is scrolled to, which reads as the row
 * assembling itself rather than sliding past.
 *
 * The index goes to CSS as a custom property so the cascade can run across all
 * twelve. The shared stagger in Motion.tsx caps at four steps, which is right
 * for a four-card grid and wrong for a list this long.
 */
export function StackStrip() {
  return (
    <section
      aria-label="Tools and platforms"
      className="section section--band section--raised stack-strip"
    >
      <div className="stack-strip__row">
        {stack.map((item, i) => (
          <span
            key={item.label}
            className="stack-strip__item"
            style={{ "--i": i } as React.CSSProperties}
          >
            <StackIcon item={item} />
            <span className="stack-strip__label">{item.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
