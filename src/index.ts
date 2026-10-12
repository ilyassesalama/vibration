import { attachDragSurface, cancelDragTick, requestDragTick } from "./drag.js";
import { type HapticInput, resolvePattern } from "./patterns.js";
import { cancelRelayHaptic, installRelay, requestRelayHaptic } from "./relay.js";
import { playTicks, stopTicks } from "./switch.js";
import { stopVibrating, vibrate } from "./vibrate.js";

export { presets } from "./patterns.js";
export type { HapticInput, Pattern, PresetName, Pulse } from "./patterns.js";

/**
 * How this browser produces haptics:
 * - `"vibrate"`: the Vibration API (Android). Patterns, emulated intensity, callable any time after the first tap.
 * - `"ios-relay"`: iOS 26.5+. One Taptic tick per tap; call `haptic()` while handling the tap.
 * - `"ios-switch"`: iOS 18 – 26.4. Patterns as Taptic ticks, within one second of a tap (any time before iOS 18.4).
 * - `"none"`: no haptics (desktop, iPad, older iOS, server).
 */
export type HapticEngine = "vibrate" | "ios-relay" | "ios-switch" | "none";

function detectEngine(): HapticEngine {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "none";
  if (typeof navigator.vibrate === "function") return "vibrate";
  // Taptic ticks come from toggling <input type="checkbox" switch>, which only iOS Safari (WebKit) supports.
  const iOS = navigator.maxTouchPoints > 0 && CSS.supports("-webkit-touch-callout", "none");
  if (!iOS || !("switch" in HTMLInputElement.prototype)) return "none";
  return labelClickIsTrusted() ? "ios-switch" : "ios-relay";
}

/** Whether a scripted label click reaches its control as a trusted click (WebKit before May 2026). */
function labelClickIsTrusted(): boolean {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  label.append(input);
  let trusted = false;
  input.addEventListener("click", (event) => {
    trusted = event.isTrusted;
    event.preventDefault();
  });
  label.click();
  return trusted;
}

export const engine: HapticEngine = detectEngine();

if (engine === "ios-relay") installRelay();

/**
 * Plays haptic feedback. Returns whether it will be felt (as far as the browser can tell).
 *
 * Call it from the handler of a tap (`click`, `pointerdown`, `pointerup`, `touchend`).
 * Android also allows it at any time after the first tap. iOS plays a single tick per
 * tap on 26.5+, and ticks for each pulse on earlier versions.
 */
export function haptic(input: HapticInput = "medium"): boolean {
  const pulses = resolvePattern(input);
  const audible = pulses.some((pulse) => pulse.duration > 0 && pulse.intensity > 0);
  if (engine === "ios-relay" || engine === "ios-switch") {
    // During a drag on a surface from hapticDrag(), each call is one tick.
    const dragTick = requestDragTick();
    if (dragTick !== null) return audible && dragTick;
  }
  switch (engine) {
    case "vibrate":
      return vibrate(pulses);
    case "ios-switch":
      return playTicks(pulses);
    case "ios-relay":
      return audible && requestRelayHaptic();
    case "none":
      return false;
  }
}

/**
 * Lets `haptic()` tick repeatedly while a finger drags across `element`, for sliders,
 * pickers, scrubbers and the like. Only iPhones need it: elsewhere `haptic()` already works
 * during drags, and this does nothing. Returns a function that undoes it.
 *
 * On iPhone, each `haptic()` call during the drag plays one tick on the finger's next
 * movement, starting 0.2s into the drag. Touches that start on the element don't scroll the
 * page or produce `click` events; pointer and touch events reach your handlers as usual.
 */
export function hapticDrag(element: HTMLElement): () => void {
  if (engine !== "ios-relay" && engine !== "ios-switch") return () => {};
  return attachDragSurface(element);
}

/** Stops a pattern that is still playing. */
export function cancel(): void {
  switch (engine) {
    case "vibrate":
      stopVibrating();
      break;
    case "ios-switch":
      stopTicks();
      cancelDragTick();
      break;
    case "ios-relay":
      cancelRelayHaptic();
      cancelDragTick();
      break;
  }
}
