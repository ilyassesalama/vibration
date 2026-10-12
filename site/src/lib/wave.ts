import type { Pattern } from "vibration";
import { length, segments } from "./feedback";

/** Shortest time span a trace covers, so single short taps read as a small blip. */
const MIN_SPAN = 240;
/** Distance between wave crests, in viewBox units. */
const PERIOD = 7;

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** How long a pattern's trace takes to play, in ms: the pattern itself, or the minimum span. */
export const traceSpan = (pattern: Pattern) => Math.max(length(pattern), MIN_SPAN);

/**
 * An SVG path that draws a pattern like a vibration trace: a wave whose amplitude is each
 * pulse's intensity, flat in the gaps.
 */
export function tracePath(pattern: Pattern, width: number, height: number): string {
  const timing = segments(pattern);
  const span = traceSpan(pattern);
  const middle = height / 2;
  const reach = height / 2 - 2;
  const ramp = span * 0.012;
  const points: string[] = [];

  for (let x = 0; x <= width; x += 0.75) {
    const t = (x / width) * span;
    let amplitude = 0;
    for (const { start, duration, intensity } of timing) {
      if (t < start || t > start + duration) continue;
      const edge = Math.min(t - start, start + duration - t);
      amplitude = intensity * Math.min(1, 0.3 + edge / ramp);
      break;
    }
    const y = middle - Math.sin((x * 2 * Math.PI) / PERIOD) * amplitude * reach;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${points.join("L")}`;
}

/** Lights the trace up left to right in real time, then lets it fade. */
export function playTrace(lit: Element, pattern: Pattern): void {
  if (reducedMotion.matches) {
    lit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease-out" });
    return;
  }
  lit
    .animate([{ clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", opacity: 1 }], {
      duration: traceSpan(pattern),
      easing: "linear",
      fill: "forwards",
    })
    .finished.then(
      () => lit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: "ease-out", fill: "forwards" }),
      () => {},
    );
}

/**
 * Shakes an element in step with a pattern: the visible stand-in for the vibration on
 * screens without a motor. Keyframes every ~16ms, displacement scaled by intensity.
 */
export function jolt(element: Element, pattern: Pattern, strength = 2.2): void {
  if (reducedMotion.matches) return;
  const timing = segments(pattern);
  const total = Math.max(length(pattern), 40);
  const frames: Keyframe[] = [];
  for (let t = 0; t <= total; t += 16) {
    const active = timing.find((s) => t >= s.start && t < s.start + Math.max(s.duration, 24));
    const x = active ? Math.sin(t * 0.55) * strength * (0.4 + 0.6 * active.intensity) : 0;
    frames.push({ transform: `translateX(${x.toFixed(2)}px)`, offset: Math.min(1, t / total) });
  }
  frames.push({ transform: "translateX(0)", offset: 1 });
  element.animate(frames, { duration: total, easing: "linear" });
}
