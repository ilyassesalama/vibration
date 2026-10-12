import { Builder } from "./components/Builder";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Nav } from "./components/Nav";
import { PresetStrip } from "./components/PresetStrip";
import { Ruler } from "./components/Ruler";
import { Section } from "./components/Section";
import { UseIt } from "./components/UseIt";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PresetStrip />
        <Section
          title="Slide for a tick at every step"
          lede="Drag along the ruler. Every mark you pass is its own haptic, on iPhone too, where hapticDrag() lets one gesture play many ticks."
        >
          <Ruler />
        </Section>
        <Section
          title="Compose your own"
          lede="Tap the timeline to add a pulse, drag it to move it, and pull its right edge to make it longer. The code below updates as you go."
        >
          <Builder />
        </Section>
        <UseIt />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
