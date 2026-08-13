import { Header } from "@/components/Header";
import { Footer } from "@/components/sections/Footer";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Tracker } from "@/components/Tracker";
import { ldJson, personJsonLd, professionalServiceJsonLd } from "@/lib/jsonld";

/**
 * Chrome shared by every public page. This used to be repeated inside each
 * page, which meant four copies of the skip link and four chances to forget
 * one. The admin group deliberately has none of it.
 *
 * Person and ProfessionalService live here rather than in the root layout so
 * the structured data describes the marketing site only — /admin is not part
 * of the public entity graph and should not carry it.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a href="#main" className="skip-link">
        SKIP TO CONTENT
      </a>
      <Header />
      {children}
      <Footer />

      {/* Public pages only. The console must not appear in the analytics it
          exists to inspect, so neither of these is in the (admin) group. */}
      <Tracker />
      <ConsentBanner />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(professionalServiceJsonLd) }}
      />
    </>
  );
}
