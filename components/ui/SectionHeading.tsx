type Props = {
  eyebrow: string;
  kicker?: string;
  title: string;
  /** id for the <h2>, referenced by the section's aria-labelledby */
  titleId: string;
};

export function SectionHeading({ eyebrow, kicker, title, titleId }: Props) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      {kicker && <span className="eyebrow eyebrow--muted">{kicker}</span>}
      <h2 id={titleId} className="h2">
        {title}
      </h2>
    </div>
  );
}
