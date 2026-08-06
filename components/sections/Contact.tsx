import { contact, linkedinUrl, proof, site, upworkUrl } from "@/content/site";
import { CalendlyInline } from "@/components/CalendlyInline";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { SocialIcon } from "@/components/ui/Icon";

export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="contact-grid"
    >
      <div className="contact-copy">
      <span className="eyebrow">{contact.eyebrow}</span>

      <h2 id="contact-title" className="contact-title">
        {contact.title}
      </h2>

      <p
        style={{
          margin: 0,
          maxWidth: "58ch",
          fontSize: "16px",
          lineHeight: 1.65,
          color: "var(--muted)",
          textWrap: "pretty",
        }}
      >
        {contact.body}
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          marginTop: "4px",
        }}
      >
        <CalendlyPopupButton className="btn btn-primary" placement="contact">
          BOOK A 30-MIN CALL →
        </CalendlyPopupButton>
        <a href={`mailto:${site.email}`} className="btn btn-ghost">
          {site.email.toUpperCase()}
        </a>
        <a href={upworkUrl} target="_blank" rel="noopener" className="pill">
          <SocialIcon name="upwork" size={16} />
          {proof.contactChip}
        </a>
        <a href={linkedinUrl} target="_blank" rel="noopener" className="pill">
          <SocialIcon name="linkedin" size={16} />
          LINKEDIN
        </a>
      </div>

      </div>

      <div className="contact-booking">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            color: "var(--muted)",
          }}
        >
          {contact.calendlyHeading}
        </span>
        <CalendlyInline />
      </div>
    </section>
  );
}
