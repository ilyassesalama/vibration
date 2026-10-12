import { activate } from "./activation.js";

/**
 * iOS 26.5+ plays the switch haptic only for trusted clicks: WebKit stopped trusting the
 * click a scripted `label.click()` forwards to its switch (WebKit fc1ef83, May 2026). So
 * the haptic has to ride on the user's own tap.
 *
 * iOS dispatches a tap's click after the finger lifts, hit-testing where the touch
 * started. When the finger lifts, the relay puts a tiny invisible <label> at that point,
 * inside the touched element, so the click lands on it and still bubbles through the
 * element and its ancestors. Click handlers run as usual (`event.target` is patched back
 * to the touched element). If one of them calls `haptic()`, the label gets a switch, and
 * its default action clicks that switch with the user's trusted click: one Taptic tick.
 * Otherwise the label has no control and does nothing, so the page behaves as if the
 * relay wasn't there.
 */

/** Side of the relay square, in px, centered on the touch point and clipped to the touched element. */
const SIZE = 24;
/** How long to wait for the click after the finger lifts, in ms. iOS waits ~350ms on pages that can zoom. */
const LIFETIME = 700;

/**
 * Elements that can't render a child, so can't hold the relay. Taps on them are left
 * alone: putting the relay in their parent would hide the click from their own listeners.
 */
const CHILDLESS = new Set(["img", "video", "audio", "canvas", "iframe", "embed", "object", "meter", "progress", "br", "hr", "wbr"]);

/** Events whose target can be the relay. Their target is patched back to the touched element. */
const RETARGETED = [
  "pointerover", "pointerenter", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerout", "pointerleave",
  "touchstart", "touchmove", "touchend", "touchcancel",
  "mouseover", "mouseenter", "mousemove", "mousedown", "mouseup", "mouseout", "mouseleave",
  "click", "dblclick", "auxclick", "contextmenu", "DOMActivate",
];

interface Touch {
  target: Element;
  path: EventTarget[];
  x: number;
  y: number;
  /** The touch turned into a scroll or a multi-finger gesture: it won't produce a click. */
  cancelled: boolean;
  /** `haptic()` was called during the touch, before its click (e.g. on pointerdown). */
  pending: boolean;
}

let host: HTMLElement;
let root: ShadowRoot;
let label: HTMLLabelElement;
let toggle: HTMLInputElement;

let touch: Touch | null = null;
/** The relayed click is being dispatched. */
let dispatching = false;
/** A click handler asked for a haptic. */
let requested = false;
/** A click handler called preventDefault(). */
let prevented = false;
let expiry: ReturnType<typeof setTimeout> | undefined;

export function installRelay(): void {
  // Built with DOM APIs and styled through CSSOM, so pages enforcing Trusted Types or a
  // strict style-src CSP don't block it.
  host = document.createElement("vibration-relay");
  host.setAttribute("aria-hidden", "true");
  root = host.attachShadow({ mode: "closed" });
  label = document.createElement("label");
  label.style.cssText =
    "position:absolute;inset:0;display:block;-webkit-tap-highlight-color:transparent;" +
    "-webkit-touch-callout:none;-webkit-user-select:none;user-select:none";
  // Hidden with display:none: the tick doesn't need the switch rendered, and an unrendered
  // switch can't take focus when the label clicks it.
  toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.setAttribute("switch", "");
  toggle.style.display = "none";
  root.append(label, toggle);

  const options = { capture: true, passive: true };
  addEventListener("pointerdown", onPointerDown, options);
  addEventListener("pointerup", onPointerUp, options);
  addEventListener("pointercancel", onPointerCancel, options);
  addEventListener("scroll", onScroll, options);
  addEventListener("click", onClick, options);
  addEventListener("DOMActivate", onActivate, { capture: true });
  addEventListener("input", onInput, options);
  for (const type of RETARGETED) addEventListener(type, retarget, options);
}

/** Called by `haptic()`. Returns whether a tick will play for the current tap. */
export function requestRelayHaptic(): boolean {
  if (dispatching) {
    requested = true;
    updateLabel();
    return true;
  }
  if (touch && !touch.cancelled) {
    touch.pending = true;
    return true;
  }
  return false;
}

export function cancelRelayHaptic(): void {
  if (touch) touch.pending = false;
  if (dispatching) {
    requested = false;
    updateLabel();
  }
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === "mouse") return;
  if (!event.isPrimary) {
    if (touch) touch.cancelled = true;
    return;
  }
  const path = event.composedPath();

  // A quick second tap can land on a relay still waiting for its click; keep it.
  if (path[0] === host && touch) {
    touch = { ...touch, x: event.clientX, y: event.clientY, cancelled: false, pending: false };
    return;
  }

  removeRelay();
  const node = path[0];
  const target = node instanceof Element ? node : node instanceof Node ? node.parentElement : null;
  touch = target ? { target, path, x: event.clientX, y: event.clientY, cancelled: false, pending: false } : null;
}

function onPointerUp(event: PointerEvent): void {
  if (!touch || touch.cancelled || !event.isPrimary || event.pointerType === "mouse") return;
  const parent = relayParent(touch.target);
  if (!parent) return;
  parent.append(host);
  place(touch);
  clearTimeout(expiry);
  expiry = setTimeout(reset, LIFETIME);
}

function onPointerCancel(event: PointerEvent): void {
  if (event.isPrimary && event.pointerType !== "mouse") reset();
}

function onScroll(): void {
  if (touch) touch.cancelled = true;
  if (!dispatching) removeRelay();
}

function onClick(event: MouseEvent): void {
  if (event.target !== host || !touch) return;

  if (dispatching) {
    // The click our label forwards to the switch. The tick has played; keep the page from seeing it.
    event.stopImmediatePropagation();
    return;
  }

  dispatching = true;
  requested = touch.pending;
  prevented = false;
  updateLabel();
  // Handlers can't actually prevent the default, or the label couldn't play the tick.
  // The relay stands in for preventDefault() instead (see updateLabel and onActivate).
  Object.defineProperties(event, {
    defaultPrevented: { configurable: true, get: () => prevented },
    preventDefault: {
      configurable: true,
      value() {
        if (!event.cancelable) return;
        prevented = true;
        updateLabel();
      },
    },
    returnValue: {
      configurable: true,
      get: () => !prevented,
      set(value: boolean) {
        if (value === false) event.preventDefault();
      },
    },
  });
  setTimeout(reset, 0);
}

/**
 * The click's target (the label) dispatches DOMActivate while the click's default action
 * runs, after the label has played any tick. Buttons act on it. A prevented click must
 * not get that far; otherwise this is where the defaults the label blocks get run.
 */
function onActivate(event: Event): void {
  if (event.target !== host || !dispatching || !touch) return;
  if (prevented) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  activate(touch.path, requested);
}

function onInput(event: Event): void {
  // Toggling the switch fires a composed `input` event; it isn't the page's business.
  if (event.target === host) event.stopImmediatePropagation();
}

function retarget(event: Event): void {
  if (!touch) return;
  const { target, path } = touch;
  if (event.target === host) {
    Object.defineProperties(event, {
      target: { configurable: true, get: () => target },
      srcElement: { configurable: true, get: () => target },
      composedPath: { configurable: true, value: () => path.slice() },
    });
  }
  if ("relatedTarget" in event && event.relatedTarget === host) {
    Object.defineProperty(event, "relatedTarget", { configurable: true, get: () => target });
  }
}

/**
 * Gives the label the switch when a tick is wanted. When the click is prevented without
 * one, the label gets a disabled switch: clicking it does nothing, but the label still
 * handles the click's default action, so nothing else does, as with preventDefault().
 */
function updateLabel(): void {
  if (requested || prevented) {
    label.append(toggle);
    toggle.disabled = !requested;
  } else {
    root.append(toggle);
    toggle.disabled = false;
  }
}

function relayParent(target: Element): HTMLElement | null {
  // SVG and the like can't hold an HTML element.
  if (!(target instanceof HTMLElement) || CHILDLESS.has(target.localName) || target.isContentEditable) return null;
  // Drag surfaces (vibration-drag) handle their own touches.
  if (target.closest("input, textarea, select, option, vibration-drag, [data-vibration-ignore]")) return null;
  return target === document.documentElement ? document.body : target;
}

function place({ target, x, y }: Touch): void {
  const style = host.style;
  style.cssText =
    "all:initial!important;position:fixed!important;display:block!important;z-index:2147483647!important;" +
    "contain:strict!important;pointer-events:auto!important;left:0!important;top:0!important;width:100px!important;height:100px!important";

  // Fixed positioning is relative to the viewport, unless an ancestor is transformed or
  // contained. Measure where 0,0 lands and at what scale, and correct for it.
  const origin = host.getBoundingClientRect();
  const scaleX = origin.width / 100 || 1;
  const scaleY = origin.height / 100 || 1;

  // Clip to the touched element, so the relay can't catch a click meant for a neighbor.
  const bounds = target.getBoundingClientRect();
  const left = Math.max(x - SIZE / 2, Math.min(bounds.left, x - 1));
  const top = Math.max(y - SIZE / 2, Math.min(bounds.top, y - 1));
  const right = Math.min(x + SIZE / 2, Math.max(bounds.right, x + 1));
  const bottom = Math.min(y + SIZE / 2, Math.max(bounds.bottom, y + 1));

  style.setProperty("left", `${(left - origin.left) / scaleX}px`, "important");
  style.setProperty("top", `${(top - origin.top) / scaleY}px`, "important");
  style.setProperty("width", `${(right - left) / scaleX}px`, "important");
  style.setProperty("height", `${(bottom - top) / scaleY}px`, "important");
}

function removeRelay(): void {
  clearTimeout(expiry);
  host.remove();
  dispatching = false;
  requested = false;
  prevented = false;
  updateLabel();
}

function reset(): void {
  removeRelay();
  touch = null;
}
