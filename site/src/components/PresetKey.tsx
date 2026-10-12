import { useRef } from "react";
import { type PresetName, presets } from "vibration";
import { feedback, length } from "../lib/feedback";
import { titleCase, toneStyle } from "../lib/presets";
import { jolt } from "../lib/wave";
import styles from "./PresetKey.module.css";
import { Wave, type WaveHandle } from "./Wave";

export function PresetKey({ name, size }: { name: PresetName; size: "large" | "small" }) {
  const key = useRef<HTMLButtonElement>(null);
  const wave = useRef<WaveHandle>(null);
  const pattern = presets[name];

  const play = () => {
    // First thing in the handler: on iOS the haptic rides on this tap.
    feedback(pattern);
    wave.current?.play();
    if (key.current) jolt(key.current, pattern, size === "large" ? 2.4 : 1.6);
  };

  return (
    <button ref={key} type="button" className={styles.key} data-size={size} data-preset={name} style={toneStyle(name)} onClick={play}>
      <span className={styles.top}>
        <span className={styles.name}>{titleCase(name)}</span>
        <span className={styles.ms}>{length(pattern)}ms</span>
      </span>
      <Wave ref={wave} pattern={pattern} />
    </button>
  );
}
