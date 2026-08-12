import { Hero } from "@/components/sections/Hero";
import { StatBand } from "@/components/sections/StatBand";
import { StackStrip } from "@/components/sections/StackStrip";
import { Symptoms } from "@/components/sections/Symptoms";
import { Services } from "@/components/sections/Services";
import { Work } from "@/components/sections/Work";
import { Reviews } from "@/components/sections/Reviews";
import { Process } from "@/components/sections/Process";
import { About } from "@/components/sections/About";
import { Notes } from "@/components/sections/Notes";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
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
        <Notes />
        <Faq />
        <Contact />
      </main>
    </>
  );
}
