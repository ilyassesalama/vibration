export interface Pulse {
  /** How long the pulse lasts, in milliseconds. */
  duration: number;
  /** Strength from 0 to 1. Defaults to 1. Emulated on Android; iOS has a single strength. */
  intensity?: number;
  /** Silence before the pulse starts, in milliseconds. Defaults to 0. */
  delay?: number;
}

export type Pattern = readonly Pulse[];

/** A pulse with every field resolved. */
export interface ResolvedPulse {
  duration: number;
  intensity: number;
  delay: number;
}

export const presets = {
  // Notifications
  success: [
    { duration: 28, intensity: 0.55 },
    { delay: 70, duration: 42, intensity: 1 },
  ],
  warning: [
    { duration: 40, intensity: 0.85 },
    { delay: 110, duration: 40, intensity: 0.6 },
  ],
  error: [
    { duration: 45, intensity: 0.85 },
    { delay: 45, duration: 45, intensity: 0.85 },
    { delay: 45, duration: 60, intensity: 1 },
  ],
  // Impacts
  light: [{ duration: 14, intensity: 0.45 }],
  medium: [{ duration: 22, intensity: 0.7 }],
  heavy: [{ duration: 32, intensity: 1 }],
  soft: [{ duration: 40, intensity: 0.4 }],
  rigid: [{ duration: 12, intensity: 1 }],
  // Selection
  selection: [{ duration: 8, intensity: 0.35 }],
  // Expressive
  nudge: [
    { duration: 70, intensity: 0.85 },
    { delay: 90, duration: 45, intensity: 0.35 },
  ],
  buzz: [{ duration: 1000, intensity: 1 }],
} as const satisfies Record<string, Pattern>;

export type PresetName = keyof typeof presets;

/**
 * - a preset name: `"success"`
 * - a duration in ms: `200`
 * - alternating on/off durations, like `navigator.vibrate`: `[100, 50, 100]`
 * - pulses: `[{ duration: 30 }, { delay: 60, duration: 40, intensity: 0.5 }]`
 */
export type HapticInput = PresetName | number | readonly number[] | Pattern;

export function resolvePattern(input: HapticInput): ResolvedPulse[] {
  if (typeof input === "string") {
    if (!Object.hasOwn(presets, input)) {
      throw new TypeError(`vibration: unknown preset "${input}"`);
    }
    return presets[input].map(resolvePulse);
  }
  if (typeof input === "number") {
    return [resolvePulse({ duration: input })];
  }
  if (!Array.isArray(input)) {
    throw new TypeError("vibration: expected a preset name, a number, or an array");
  }
  return input.map((item: number | Pulse, index) => {
    if (typeof item !== "number") return resolvePulse(item);
    if (index % 2 === 1) return null;
    return resolvePulse({ duration: item, delay: index > 0 ? (input[index - 1] as number) : 0 });
  }).filter((pulse) => pulse !== null);
}

function resolvePulse(pulse: Pulse): ResolvedPulse {
  if (typeof pulse !== "object" || pulse === null) {
    throw new TypeError("vibration: each pulse must be an object like { duration: 20 }");
  }
  const { duration, intensity = 1, delay = 0 } = pulse;
  for (const [name, value] of [["duration", duration], ["delay", delay]] as const) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`vibration: ${name} must be a finite number >= 0, got ${String(value)}`);
    }
  }
  if (typeof intensity !== "number" || Number.isNaN(intensity)) {
    throw new TypeError(`vibration: intensity must be a number between 0 and 1, got ${String(intensity)}`);
  }
  return { duration, delay, intensity: Math.min(1, Math.max(0, intensity)) };
}
