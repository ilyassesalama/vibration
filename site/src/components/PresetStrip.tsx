import type { PresetName } from "vibration";
import { PresetKey } from "./PresetKey";
import styles from "./PresetStrip.module.css";
import { Section } from "./Section";

const MORE: PresetName[] = ["selection", "light", "medium", "heavy", "soft", "rigid", "warning"];

export function PresetStrip() {
  return (
    <Section title="Seven more presets" lede="From the lightest selection tick to a heavy thud. Every one is a single call.">
      <div className={styles.strip}>
        {MORE.map((name) => (
          <div key={name} className={styles.cell}>
            <PresetKey name={name} size="small" />
          </div>
        ))}
      </div>
    </Section>
  );
}
