import { contact, linkedinUrl, proof, site, upworkUrl } from "@/content/site";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { LeadForm } from "@/components/sections/LeadForm";
import { SocialIcon } from "@/components/ui/Icon";
import { CALENDLY_URL } from "@/lib/calendly";

export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      style={{
        paddingBlock: "64px",
        paddingInline: "max(clamp(18px, 4vw, 48px), calc((100% - 1280px) / 2))",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
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
          fontFamily: "var(--font-prose)",
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

      {/* Works with JavaScript off, and for anyone who would rather see the
          calendar page than open an overlay. */}
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-prose)",
          fontSize: "11.5px",
          letterSpacing: "0.06em",
          color: "var(--faint)",
        }}
      >
        {contact.altBooking}{" "}
        <a href={CALENDLY_URL} target="_blank" rel="noopener">
          calendly.com/sojibh2001/30min
        </a>
      </p>

      {/* Below the call CTA, not above it: booking is still the primary
          action, and the form is for people who would rather write first. */}
      <LeadForm />
    </section>
  );
}
