import { footer, footerNav, site, socials } from "@/content/site";
import { SocialIcon } from "@/components/ui/Icon";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        paddingBlock: "24px 40px",
        paddingInline: "max(clamp(18px, 4vw, 48px), calc((100% - 1280px) / 2))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.08em",
        color: "var(--muted)",
      }}
    >
      <span>{site.footerTagline}</span>

      <span
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "8px",
          marginLeft: "auto",
          order: 3,
        }}
      >
        {socials.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener"
            aria-label={social.label}
            title={social.label}
            className="icon-btn"
          >
            <SocialIcon name={social.icon} />
          </a>
        ))}
      </span>

      <nav
        aria-label="Footer"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 16px",
        }}
      >
        {footerNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              color: "inherit",
              display: "inline-flex",
              alignItems: "center",
              boxSizing: "border-box",
              minHeight: "44px",
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <span style={{ flexBasis: "100%", color: "var(--faint)", fontSize: "10.5px" }}>
        © {year} {site.fullName} · {footer.builtWith}
      </span>
    </footer>
  );
}
