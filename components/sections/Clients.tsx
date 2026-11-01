import { clientProof as clients } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Selected clients & collaborators: company names only, from the contract
 * history. The one confirmed relationship worth naming on its own, the active
 * retainer with Salt & Fuessel, leads; the rest are a quiet wall of names.
 *
 * Names as text, not logos: there is no licensed artwork for any of them, and a
 * logo drawn from memory would be a claim about someone else's brand. Listed
 * as clients, not endorsements, and the note under the wall says so.
 */
export function Clients() {
  return (
    <section id="clients" aria-labelledby="clients-title" className="section section--sunk clients">
      <SectionHeading eyebrow={clients.eyebrow} title={clients.title} titleId="clients-title" />

      <div className="clients__featured">
        <span className="clients__label">
          <span className="clients__pulse" aria-hidden="true" />
          {clients.featured.label}
        </span>
        <p className="clients__name">
          Ongoing retainer with <strong>{clients.featured.name}</strong>
        </p>
        <p className="clients__detail">{clients.featured.detail}</p>
      </div>

      <ul className="clients__wall" data-stagger>
        {clients.names.map((name) => (
          <li key={name} className="clients__item">
            {name}
          </li>
        ))}
      </ul>

      <p className="clients__note">{clients.note}</p>
    </section>
  );
}
