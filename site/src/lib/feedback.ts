import { engine, type HapticEngine, haptic, type Pattern } from "vibration";

export interface Segment {
  start: number;
  duration: number;
  intensity: number;
}

/** Absolute timing of a pattern's pulses, for drawing and previewing it. */
export function segments(pattern: Pattern): Segment[] {
  let time = 0;
  return pattern.map((pulse) => {
    time += pulse.delay ?? 0;
    const segment = { start: time, duration: pulse.duration, intensity: pulse.intensity ?? 1 };
    time += pulse.duration;
    return segment;
  });
}

export const length = (pattern: Pattern) => segments(pattern).reduce((end, s) => Math.max(end, s.start + s.duration), 0);

type Listener = (segments: Segment[]) => void;
const listeners = new Set<Listener>();

/** Subscribes to every pattern played, for the sound stand-in. */
export function onFeedback(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Plays a pattern. Call it straight from a tap handler: on iOS the haptic rides on that tap.
 * Listeners get the pattern too, for the sound stand-in.
 */
export function feedback(pattern: Pattern): boolean {
  const played = haptic(pattern);
  const timing = segments(pattern);
  for (const listener of listeners) listener(timing);
  return played;
}

const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;

/** The engine that applies here. Desktop Chrome has the Vibration API but no motor to run it. */
export const effectiveEngine: HapticEngine = desktop ? "none" : engine;

const notes: Record<HapticEngine, string> = {
  vibrate: "Full patterns, played on this phone's motor.",
  "ios-relay": "This iPhone plays one tick per tap. Slide further down for a tick at every step.",
  "ios-switch": "Each pulse plays as a tick on this iPhone.",
  none: "This browser can't vibrate. Try Chrome on Android or Safari on iPhone.",
};

/** What this device does with a tap, in one sentence. */
export const deviceNote = desktop
  ? "There's no vibration motor in this computer. Turn on sound, or open the page on your phone."
  : notes[effectiveEngine];
