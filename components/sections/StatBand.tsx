import { StatValue } from "@/components/StatValue";
import { clients, clientsLabel, proof, upworkUrl, type ClientMark } from "@/content/site";

/** Two letters for the monogram: "Salt & Fuessel" is SF, "Maitea" is MA. */
function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function ClientLogo({ client }: { client: ClientMark }) {
  if (client.mark) {
    // Plain <img>: the files are already small (see public/clients), and next/image
    // would need each one's size typed in by hand.
    return (
      <span className="clientrow__logo clientrow__logo--img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={client.mark} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className="clientrow__logo clientrow__logo--mono" aria-hidden="true">
      {initials(client.name)}
    </span>
  );
}

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

      {/* The client row: one line that drifts, each name with its mark. A
          real logo file shows where `mark` is set; until then a monogram in
          the site's own type, which claims nothing about anyone's brand. See
          the note above `clients` in content/site.ts. The second copy only
          closes the loop and is hidden from assistive tech. */}
      <div className="clientrow">
        <span className="clientrow__label">{clientsLabel}</span>
        <div className="clientrow__viewport">
          <div className="clientrow__track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="clientrow__list" aria-hidden={copy === 1 || undefined}>
                {clients.map((client) => (
                  <li key={client.name} className="clientrow__item">
                    <ClientLogo client={client} />
                    {client.name}
                    {client.note && <span className="clientrow__note">{client.note}</span>}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
