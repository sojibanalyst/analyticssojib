/**
 * A deck of cards that arrive one at a time as the page scrolls.
 *
 * Each card holds just below the header (position: sticky, which the
 * compositor handles on its own), a little lower than the one before, and the
 * next slides up over it. Where the browser can tie an animation to scroll,
 * each card also rises into place as it arrives, and the one underneath tips
 * back, shrinks and darkens while the next one covers it.
 *
 * The timing comes from the NEXT card: every item publishes its own view
 * timeline (--deck-0, --deck-1, …), and each card's tip-back runs on the
 * timeline of the item after it, so a card goes back exactly as the next one
 * arrives, whatever the card heights. timeline-scope on the list is what lets
 * a card see its sibling's timeline. Transform and opacity only. Under reduced
 * motion it is a plain list. The CSS is "Decks" in app/components.css.
 */
export function Deck({
  children,
  wideOnly = false,
  label,
}: {
  children: React.ReactNode[];
  /** Hold the cards only on wide screens; a plain list on phones. */
  wideOnly?: boolean;
  label?: string;
}) {
  const names = children.map((_, i) => `--deck-${i}`);
  return (
    <ul
      className={`deck${wideOnly ? " deck--wide" : ""}`}
      style={{ ["timelineScope" as string]: names.join(", ") }}
      aria-label={label}
      data-scroll-anim
    >
      {children.map((child, i) => (
        <li
          key={i}
          className="deck__item"
          style={{ ["--i" as string]: i, ["viewTimelineName" as string]: names[i] }}
        >
          <div
            className="deck__card"
            style={i + 1 < names.length ? { ["--deck-next" as string]: names[i + 1] } : undefined}
          >
            {child}
          </div>
        </li>
      ))}
    </ul>
  );
}
