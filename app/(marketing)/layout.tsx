import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ContactDock } from "@/components/ContactDock";
import { Header } from "@/components/Header";
import { Motion } from "@/components/Motion";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Footer } from "@/components/sections/Footer";
import { Tracker } from "@/components/Tracker";
import { nav, footerNav } from "@/content/site";
import { getPublishedPosts } from "@/lib/content";
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
export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /**
   * The WRITING section hides itself when nothing is finished (see
   * components/sections/Notes.tsx), and both nav entries for it point at
   * /#blog — an anchor that then does not exist. A link that scrolls nowhere
   * is worse than no link, so the entry goes with the section.
   *
   * Read through lib/content's cached client, the same as every other content
   * read, so this stays a build-time value and no page becomes dynamic.
   */
  const published = await getPublishedPosts();
  const hideWriting = published.length === 0;
  const headerNav = hideWriting ? nav.filter((item) => item.href !== "/#blog") : nav;
  const footerLinks = hideWriting
    ? footerNav.filter((item) => item.href !== "/#blog")
    : footerNav;

  return (
    <>
      <ScrollProgress />

      <AnnouncementBar />

      <a href="#main" className="skip-link">
        SKIP TO CONTENT
      </a>
      <Header items={headerNav} />
      {children}
      <Footer links={footerLinks} />

      {/* Public pages only. The console must not appear in the analytics it
          exists to inspect, so this is not in the (admin) group. */}
      <Tracker />

      {/* Scroll reveal. Renders nothing; hides nothing unless it runs. */}
      <Motion />

      {/* Last in the DOM on purpose: it is a shortcut, so a keyboard user
          reaches it after the page's own content rather than before it. */}
      <ContactDock />

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
