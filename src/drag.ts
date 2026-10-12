/**
 * Ticks while a finger drags, on iOS 18+ including 26.5+. Besides clicks, iOS plays the
 * switch tick when a finger dragging a switch's thumb crosses the middle of the switch
 * ("pointer tracking"), and that needs no trusted click: one tick per crossing.
 *
 * A drag surface covers an element with an invisible switch so touches start on it. While
 * the finger moves, the switch is kept under it, wide and positioned so the finger sits a
 * quarter of the way in. When `haptic()` asks for a tick, the switch is moved so the finger
 * sits three quarters of the way in instead: the next touchmove crosses the middle and iOS
 * ticks. Then it stays there until the next tick moves it back.
 *
 * WebKit starts tracking 200ms after the touch starts, so earlier ticks can't play.
 */

/** Width of the switch while dragging, in px. Wide enough that no real drag reaches its ends. */
const WIDTH = 4000;
/** Where the finger sits in the switch: a quarter or three quarters of the way in. */
const SIDES = [WIDTH / 4, (WIDTH * 3) / 4] as const;
/** WebKit starts tracking the switch 200ms after touchstart; wait a little longer to be sure. */
const HOLD = 250;

const REST =
  "-webkit-appearance:none;appearance:none;position:absolute;left:0;top:0;width:100%;height:100%;margin:0;padding:0;border:0;opacity:0;pointer-events:auto";

/** Pointer and touch events can target a surface. Their target is patched to the element under the finger. */
const RETARGETED = [
  "pointerover", "pointerenter", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerout", "pointerleave",
  "gotpointercapture", "lostpointercapture", "touchstart", "touchmove", "touchend", "touchcancel",
];

interface Surface {
  host: HTMLElement;
  toggle: HTMLInputElement;
  /** When the switch can be shown again after a touch: WebKit's hold timer must have fired by then. */
  restore?: ReturnType<typeof setTimeout>;
}

interface Drag {
  surface: Surface;
  touch: number;
  startedAt: number;
  x: number;
  /** Which side of the switch's middle the finger is kept on: 0 or 1. */
  side: 0 | 1;
  /** A tick was asked for and will play on the next touchmove. */
  pending: boolean;
  /** The touchmove being dispatched, while it is. */
  move: Event | null;
  /** That touchmove already crossed: one tick per touchmove. */
  crossed: boolean;
  target: Element;
  path: EventTarget[];
}

const surfaces = new WeakMap<EventTarget, Surface>();
let drag: Drag | null = null;
let installed = false;

export function attachDragSurface(element: HTMLElement): () => void {
  if (!installed) install();

  const host = document.createElement("vibration-drag");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "all:initial!important;position:absolute!important;inset:0!important;display:block!important;z-index:2147483647!important;" +
    "contain:strict!important;touch-action:none!important;-webkit-tap-highlight-color:transparent!important;" +
    "-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.setAttribute("switch", "");
  toggle.tabIndex = -1;
  toggle.style.cssText = REST;
  host.attachShadow({ mode: "closed" }).append(toggle);

  const surface: Surface = { host, toggle };
  surfaces.set(host, surface);

  // The surface covers the element, so the element has to contain it.
  const staticPosition = getComputedStyle(element).position === "static";
  const position = element.style.position;
  if (staticPosition) element.style.position = "relative";
  element.append(host);

  return () => {
    clearTimeout(surface.restore);
    if (drag?.surface === surface) drag = null;
    host.remove();
    if (staticPosition) element.style.position = position;
  };
}

/** Null when no drag is in progress, otherwise whether a tick will play for it. */
export function requestDragTick(): boolean | null {
  if (!drag) return null;
  if (performance.now() - drag.startedAt < HOLD) return false;
  if (globalThis.event === drag.move) {
    // Asked for while the touchmove is dispatched: the switch reads its position once listeners are done.
    if (!drag.crossed) cross(drag);
  } else {
    drag.pending = true;
  }
  return true;
}

export function cancelDragTick(): void {
  if (drag) drag.pending = false;
}

function install(): void {
  installed = true;
  const options = { capture: true, passive: true };
  addEventListener("touchstart", onTouchStart, options);
  addEventListener("touchmove", onTouchMove, options);
  addEventListener("touchend", onTouchEnd, options);
  addEventListener("touchcancel", onTouchEnd, options);
  for (const type of RETARGETED) addEventListener(type, retarget, options);
}

function onTouchStart(event: TouchEvent): void {
  const surface = surfaces.get(event.target!);
  // WebKit tracks a switch for a single touch.
  if (!surface || drag || event.targetTouches.length !== 1) return;
  const touch = event.changedTouches[0]!;
  const target = elementUnder(touch.clientX, touch.clientY, surface.host);
  drag = {
    surface,
    touch: touch.identifier,
    startedAt: performance.now(),
    x: touch.clientX,
    side: 0,
    pending: false,
    move: null,
    crossed: false,
    target,
    path: pathOf(target),
  };
  place(drag);
}

function onTouchMove(event: TouchEvent): void {
  if (!drag || event.target !== drag.surface.host) return;
  const touch = find(event.changedTouches, drag.touch);
  if (!touch) return;
  drag.x = touch.clientX;
  drag.move = event;
  drag.crossed = false;
  if (drag.pending && performance.now() - drag.startedAt >= HOLD) {
    drag.pending = false;
    cross(drag);
  } else {
    place(drag);
  }
}

function onTouchEnd(event: TouchEvent): void {
  if (!drag || event.target !== drag.surface.host || find(event.touches, drag.touch)) return;
  const { surface, startedAt } = drag;
  drag = null;
  // Unrender the switch before WebKit handles the touchend. It then just stops tracking:
  // no click, and no tick on release. It stays unrendered until WebKit's hold timer has
  // fired, so a short tap can't start tracking after the finger is gone.
  surface.toggle.style.display = "none";
  void surface.toggle.offsetWidth;
  clearTimeout(surface.restore);
  surface.restore = setTimeout(() => {
    surface.toggle.style.cssText = REST;
  }, Math.max(0, startedAt + HOLD + 50 - performance.now()));
}

function cross(current: Drag): void {
  current.side = current.side === 0 ? 1 : 0;
  current.crossed = true;
  place(current);
}

/** Puts the switch under the finger, with the finger on the current side of its middle. */
function place({ surface: { host, toggle }, x, side }: Drag): void {
  const box = host.getBoundingClientRect();
  const scale = box.width / host.offsetWidth || 1;
  const left = (x - box.left) / scale - SIDES[side];
  toggle.style.cssText =
    `-webkit-appearance:none;appearance:none;position:absolute;top:0;left:${left}px;width:${WIDTH}px;height:8px;` +
    "margin:0;padding:0;border:0;opacity:0;pointer-events:none";
  // The switch reads its layout synchronously when it handles the touch.
  void toggle.offsetWidth;
}

function retarget(event: Event): void {
  if (!drag || event.target !== drag.surface.host) return;
  const { target, path } = drag;
  Object.defineProperties(event, {
    target: { configurable: true, get: () => target },
    srcElement: { configurable: true, get: () => target },
    composedPath: { configurable: true, value: () => path.slice() },
  });
}

function elementUnder(x: number, y: number, host: HTMLElement): Element {
  for (const element of document.elementsFromPoint(x, y)) {
    if (element !== host && !host.contains(element)) return element;
  }
  return host.parentElement ?? document.body;
}

function pathOf(element: Element): EventTarget[] {
  const path: EventTarget[] = [];
  for (let node: Node | null = element; node; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
    path.push(node);
  }
  path.push(window);
  return path;
}

function find(list: TouchList, identifier: number): Touch | undefined {
  for (const touch of list) if (touch.identifier === identifier) return touch;
  return undefined;
}
