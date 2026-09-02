type Props = {
  /**
   * Optional. Five of the nine sections dropped theirs: with the numbering
   * gone, "REVIEWS" above "CLIENTS ON THE RECORD" or "CONTACT" above "SEND ME
   * YOUR GA4 AND YOUR ORDER TOTAL" was a label restating the heading under it.
   * A label earns its place by adding something the heading does not say.
   */
  eyebrow?: string;
  kicker?: string;
  title: string;
  /** id for the <h2>, referenced by the section's aria-labelledby */
  titleId: string;
};

export function SectionHeading({ eyebrow, kicker, title, titleId }: Props) {
  return (
    <div className="section-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {kicker && <span className="eyebrow eyebrow--muted">{kicker}</span>}
      <h2 id={titleId} className="h2">
        {title}
      </h2>
    </div>
  );
}
