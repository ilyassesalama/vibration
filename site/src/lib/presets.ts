import type { CSSProperties } from "react";
import type { PresetName } from "vibration";

const tones: Record<PresetName, string> = {
  success: "success",
  nudge: "nudge",
  error: "error",
  buzz: "buzz",
  warning: "warning",
  light: "neutral",
  medium: "neutral",
  heavy: "neutral",
  soft: "soft",
  rigid: "rigid",
  selection: "selection",
};

/** CSS variables `--tone` and `--tone-bg` for a preset's color. */
export const toneStyle = (name: PresetName) =>
  ({ "--tone": `var(--${tones[name]})`, "--tone-bg": `var(--${tones[name]}-bg)` }) as CSSProperties;

export const titleCase = (name: string) => name[0]!.toUpperCase() + name.slice(1);
