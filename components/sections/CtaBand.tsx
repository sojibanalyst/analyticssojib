import Link from "next/link";

import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { pages } from "@/content/site";

/**
 * The one call to action on every page except the homepage, which ends in the
 * full contact block instead. One band, one button, one way to the form: the
 * contact block itself is not repeated, so there is one place to change it.
 */
export function CtaBand() {
  const copy = pages.ctaBand;
  return (
    <section className="section section--band cta-band" aria-labelledby="cta-band-title">
      <div className="cta-band__text">
        <h2 id="cta-band-title" className="cta-band__title">
          {copy.title}
        </h2>
        <p className="cta-band__body">{copy.body}</p>
      </div>
      <div className="cta-band__actions">
        <CalendlyPopupButton className="btn btn-primary" placement="cta-band">
          {copy.cta}
        </CalendlyPopupButton>
        <Link href="/#contact" className="btn btn-ghost">
          {copy.write}
        </Link>
      </div>
    </section>
  );
}
