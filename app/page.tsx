import { Header } from "@/components/Header";
import { Hero } from "@/components/sections/Hero";
import { StatBand } from "@/components/sections/StatBand";
import { StackStrip } from "@/components/sections/StackStrip";
import { Symptoms } from "@/components/sections/Symptoms";
import { Services } from "@/components/sections/Services";
import { Work } from "@/components/sections/Work";
import { Reviews } from "@/components/sections/Reviews";
import { Process } from "@/components/sections/Process";
import { About } from "@/components/sections/About";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        SKIP TO CONTENT
      </a>
      <Header />
      <main id="main">
        <Hero />
        <StatBand />
        <StackStrip />
        <Symptoms />
        <Services />
        <Work />
        <Reviews />
        <Process />
        <About />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
