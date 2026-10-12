import type { ResolvedPulse } from "./patterns.js";

/** Length of one modulation cycle, in ms. Intensity is emulated by vibrating for part of each cycle. */
const CYCLE = 20;
/** Shortest vibration a phone motor reliably renders, in ms. Weaker pulses shrink toward it, not below. */
const MIN_ON = 6;

/**
 * Flattens pulses into the alternating on/off list `navigator.vibrate` takes
 * (index 0 is "on"), emulating intensity with pulse-width modulation.
 */
function toVibrationPattern(pulses: readonly ResolvedPulse[]): number[] {
  const pattern: number[] = [];
  const push = (on: boolean, ms: number) => {
    if (ms <= 0) return;
    const lastIsOn = pattern.length % 2 === 1;
    if (pattern.length > 0 && lastIsOn === on) {
      pattern[pattern.length - 1]! += ms;
      return;
    }
    if (pattern.length === 0 && !on) pattern.push(0);
    pattern.push(ms);
  };

  for (const { delay, duration, intensity } of pulses) {
    push(false, delay);
    if (intensity >= 1) {
      push(true, duration);
      continue;
    }
    if (intensity <= 0) {
      push(false, duration);
      continue;
    }
    for (let remaining = duration; remaining > 0; remaining -= CYCLE) {
      const cycle = Math.min(CYCLE, remaining);
      const on = cycle <= MIN_ON ? cycle : Math.round(MIN_ON + (cycle - MIN_ON) * intensity);
      push(true, on);
      push(false, cycle - on);
    }
  }

  // A trailing pause does nothing.
  if (pattern.length % 2 === 0) pattern.pop();
  // Only silence: nothing left but the zero-length vibration a leading pause starts with.
  if (pattern.length === 1 && pattern[0] === 0) return [];
  return pattern;
}

export function vibrate(pulses: readonly ResolvedPulse[]): boolean {
  const pattern = toVibrationPattern(pulses);
  if (pattern.length === 0) return false;
  return navigator.vibrate(pattern);
}

export function stopVibrating(): void {
  navigator.vibrate(0);
}
