import type { HapticEngine } from "vibration";
import { effectiveEngine } from "../lib/feedback";
import styles from "./HowItWorks.module.css";
import { Section } from "./Section";

const steps = [
  { title: "Your finger lifts", text: "The library slips a tiny invisible label under it, inside the element you touched." },
  { title: "Your handler calls haptic()", text: "That label gets a hidden switch. Your click handlers run as usual." },
  {
    title: "iOS plays the tick",
    text: "The tap's own trusted click toggles the switch. If nothing asked for a haptic, there is no switch and nothing happens.",
  },
];

const platforms: { engine: HapticEngine; name: string; text: string }[] = [
  { engine: "vibrate", name: "Android", text: "Full patterns through the Vibration API, with intensity shaped by pulse-width modulation." },
  { engine: "ios-relay", name: "iPhone, iOS 26.5 and later", text: "One tick per tap, riding on the tap itself, and a tick at every step of a drag." },
  { engine: "ios-switch", name: "iPhone, iOS 18 to 26.4", text: "Patterns played tick by tick, within a second of a tap." },
  { engine: "none", name: "Desktop and iPad", text: "No vibration motor, so haptic() returns false and does nothing." },
];

export function HowItWorks() {
  return (
    <Section
      id="how"
      title="How it works on iPhone"
      lede="iPhones have no vibration API. The only haptic a web page can reach is the tick iOS plays when a switch control toggles, and since iOS 26.5 it plays only when a person really toggled it. So the haptic rides on the person's own tap."
    >
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className={styles.number}>{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <ul className={styles.platforms}>
        {platforms.map((platform) => (
          <li key={platform.engine}>
            <div className={styles.head}>
              <h3>{platform.name}</h3>
              {platform.engine === effectiveEngine && <span className={styles.badge}>This device</span>}
            </div>
            <p>{platform.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
