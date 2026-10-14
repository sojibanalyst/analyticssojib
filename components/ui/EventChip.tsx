type Props = {
  /** The event name, exactly as it is sent: `purchase`, `generate_lead`. */
  name: string;
  /** Where it goes. Rendered after an arrow, joined with a middle dot. */
  destinations?: string[];
  /**
   * `fired` is the default: a green dot. `broken` is for "before" states and
   * is the only place the chip turns red. `idle` is a dim dot for an event
   * that is documented but has not been seen.
   */
  state?: "fired" | "broken" | "idle";
  className?: string;
};

const STATE_LABEL = { fired: "fired", broken: "not firing", idle: "not seen yet" } as const;

/**
 * A mono pill that reads like a line from a tag debugger:
 *
 *   ● purchase → GA4 · Meta · Ads
 *
 * The dot is decoration to a sighted reader and nothing at all to a screen
 * reader, so the state is also written out in visually hidden text. Colour is
 * never the only thing saying an event is broken.
 */
export function EventChip({ name, destinations, state = "fired", className }: Props) {
  return (
    <span className={["evt-chip", className].filter(Boolean).join(" ")} data-state={state}>
      <span className="evt-chip__dot" aria-hidden="true" />
      <code className="evt-chip__name">{name}</code>
      <span className="sr-only">, {STATE_LABEL[state]}</span>
      {destinations?.length ? (
        <>
          <span className="evt-chip__arrow" aria-hidden="true">
            →
          </span>
          <span className="sr-only"> sent to </span>
          <span className="evt-chip__dest">{destinations.join(" · ")}</span>
        </>
      ) : null}
    </span>
  );
}
