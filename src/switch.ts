import type { ResolvedPulse } from "./patterns.js";

/**
 * iOS 18.0 – 26.4: clicking a <label> from script toggles its switch with a trusted
 * click, and every trusted switch toggle plays one Taptic tick. iOS 18.4+ also requires
 * a recent tap; WebKit carries that tap through setTimeout chains for one second, so
 * patterns are played with chained timeouts (requestAnimationFrame does not carry it).
 */

/** Fastest tick rate, used at full intensity. Dense enough to read as a continuous buzz. */
const MIN_INTERVAL = 26;
/** Slowest tick rate, used as intensity approaches 0. */
const MAX_INTERVAL = 140;
/** How long a single tick feels, in ms. A pulse gets another tick only if a whole one fits. */
const TICK_LENGTH = 40;

let label: HTMLLabelElement | undefined;
let generation = 0;

/** Times, in ms from the start, at which to tick for the given pulses. */
export function tickTimes(pulses: readonly ResolvedPulse[]): number[] {
  const times: number[] = [];
  let start = 0;
  for (const { delay, duration, intensity } of pulses) {
    start += delay;
    if (intensity > 0 && duration > 0) {
      const interval = MIN_INTERVAL + (1 - intensity) * (MAX_INTERVAL - MIN_INTERVAL);
      times.push(start);
      for (let at = interval; at + TICK_LENGTH <= duration; at += interval) times.push(start + at);
    }
    start += duration;
  }
  return times;
}

function tick(): void {
  if (!label) {
    label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.append(input);
  }
  label.click();
}

export function playTicks(pulses: readonly ResolvedPulse[]): boolean {
  const times = tickTimes(pulses);
  if (times.length === 0) return false;

  const current = ++generation;
  const start = performance.now();
  let index = 0;
  const step = () => {
    if (current !== generation) return;
    // When timers run late, drop the ticks already missed instead of firing them in a burst.
    const elapsed = performance.now() - start;
    while (index + 1 < times.length && times[index + 1]! <= elapsed) index++;
    tick();
    index++;
    if (index < times.length) setTimeout(step, times[index]! - (performance.now() - start));
  };

  // Tick synchronously when possible, so the first tick lands inside the tap itself.
  if (times[0] === 0) step();
  else setTimeout(step, times[0]);
  return true;
}

export function stopTicks(): void {
  generation++;
}
