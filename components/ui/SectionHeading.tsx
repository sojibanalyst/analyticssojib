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
  /**
   * "h1" where this heading is the page's own title and nothing sits above
   * it (the blog index). It looks the same; a page with no h1 has no title
   * as far as a screen reader or a crawler can tell.
   */
  as?: "h1" | "h2";
};

export function SectionHeading({ eyebrow, kicker, title, titleId, as: Tag = "h2" }: Props) {
  return (
    <div className="section-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {kicker && <span className="eyebrow eyebrow--muted">{kicker}</span>}
      <Tag id={titleId} className="h2">
        {title}
      </Tag>
    </div>
  );
}
