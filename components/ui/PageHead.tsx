type Props = {
  eyebrow: string;
  title: string;
  lead: string;
  /** id for the <h1>, referenced by the section's aria-labelledby */
  titleId: string;
};

/**
 * The top of every page behind the nav: its one <h1> and a sentence saying
 * what is on it. The sections below keep their own <h2>s, so the outline
 * reads the same as it did when they all lived on the homepage.
 */
export function PageHead({ eyebrow, title, lead, titleId }: Props) {
  return (
    <section className="section page-head" aria-labelledby={titleId}>
      <span className="eyebrow">{eyebrow}</span>
      <h1 id={titleId} className="page-head__title">
        {title}
      </h1>
      <p className="page-head__lead">{lead}</p>
    </section>
  );
}
