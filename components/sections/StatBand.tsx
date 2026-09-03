import { StatValue } from "@/components/StatValue";
import { clients, clientsLabel, proof, upworkUrl } from "@/content/site";

/**
 * The proof line.
 *
 * It was four cards in a grid — a rating, a job success score, a job count and
 * hours worked — which is the shape of an Upwork profile, not of a practice.
 * See the note above `proof` in content/site.ts for what was dropped and why.
 *
 * Centred, because this is the one strip on the page whose job is to be read
 * in a second and believed. The figures still count up, and the verification
 * link is still here: the numbers are checkable or they are decoration.
 */
export function StatBand() {
  return (
    <section aria-label="Track record" className="section section--evidence section--sunk proofline">
      <p className="proofline__row">
        <span className="proofline__stars" aria-hidden="true">
          ★★★★★
        </span>
        <span className="proofline__figure">
          <StatValue value={proof.rating} />
        </span>
        <span className="proofline__text">
          from <StatValue value={proof.reviews} /> reviews
        </span>
        <span className="proofline__dot" aria-hidden="true" />
        <span className="proofline__text">
          <StatValue value={proof.projects} /> projects delivered
        </span>
        <span className="proofline__dot" aria-hidden="true" />
        <span className="proofline__badge">{proof.badge}</span>
      </p>

      <a className="proofline__verify" href={upworkUrl} target="_blank" rel="noopener">
        {proof.verifyLabel}
      </a>

      {/* The client row. Set in the site's own type rather than with fetched
          artwork — see the note above `clients` in content/site.ts for who is
          on it and why nobody else is. */}
      <div className="clientrow">
        <span className="clientrow__label">{clientsLabel}</span>
        <ul className="clientrow__list">
          {clients.map((client) => (
            <li key={client.name} className="clientrow__item">
              {client.name}
              {client.note && <span className="clientrow__note">{client.note}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
