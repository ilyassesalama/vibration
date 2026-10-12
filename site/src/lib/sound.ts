import { useSyncExternalStore } from "react";
import { onFeedback, type Segment } from "./feedback";

let context: AudioContext | undefined;

/** A low buzz per pulse, like a phone vibrating on a desk. */
function playSound(timing: Segment[]): void {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  const ctx = context;
  const origin = ctx.currentTime + 0.01;

  for (const { start, duration, intensity } of timing) {
    if (intensity <= 0 || duration <= 0) continue;
    const begin = origin + start / 1000;
    const end = begin + Math.max(duration, 14) / 1000;
    const peak = 0.05 + 0.13 * intensity;

    const oscillator = ctx.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = 140 + 60 * intensity;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700 + 900 * intensity;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, begin);
    gain.gain.linearRampToValueAtTime(peak, begin + 0.004);
    gain.gain.setValueAtTime(peak, Math.max(begin + 0.004, end - 0.008));
    gain.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(filter).connect(gain).connect(ctx.destination);
    oscillator.start(begin);
    oscillator.stop(end + 0.02);
  }
}

// Sound stands in for haptics where there's no motor, so it starts on with a mouse.
const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;
let enabled = false;
let unsubscribe: (() => void) | undefined;
const listeners = new Set<() => void>();

export function setSound(on: boolean): void {
  if (on === enabled) return;
  enabled = on;
  unsubscribe?.();
  unsubscribe = on ? onFeedback(playSound) : undefined;
  for (const listener of listeners) listener();
}

setSound(desktop);

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
  );
  return [on, setSound];
}
