# vibration

Haptic feedback for the mobile web. One function vibrates Android phones and iPhones,
including iOS 26.5 and later, where other web haptics stopped working.

**[Try it on your phone →](https://ilyassesalama.github.io/vibration/)**

[![The vibration demo site: tap a preset to feel it](https://raw.githubusercontent.com/ilyassesalama/vibration/main/site/public/og.png)](https://ilyassesalama.github.io/vibration/)

- **One call.** `haptic("success")` from any tap handler, with nothing to set up or mount.
- **iPhone support.** Taptic ticks on iOS 18 and later, including 26.5+.
- **Patterns.** 11 built-in presets, or your own pulses with timing and intensity.
- **Small.** About 4 kB minified and gzipped, with no dependencies.

## Install

```sh
npm i vibration
```

## Usage

```ts
import { haptic } from "vibration";

button.addEventListener("click", () => haptic("success"));
```

It's a plain function, so it works the same in React, Vue, Svelte or anything else:

```tsx
<button onClick={() => haptic("success")}>Pay</button>
```

Call `haptic()` while handling a tap (`click`, `pointerdown`, `pointerup` or `touchend`).
iPhones only play haptics in response to one.

### Presets

| Preset | Feels like |
| --- | --- |
| `success` | a soft tap, then a firm one |
| `warning` | two firm taps with a pause |
| `error` | three sharp taps |
| `light`, `medium`, `heavy` | a single tap of increasing weight |
| `soft`, `rigid` | a cushioned tap, a crisp tap |
| `selection` | the lightest tick, for pickers and toggles |
| `nudge` | a strong tap, then a faint one |
| `buzz` | one second of vibration |

### Custom patterns

```ts
haptic(200); // vibrate for 200 ms
haptic([100, 50, 100]); // on/off durations, like navigator.vibrate

// pulses with an optional delay before each and an intensity from 0 to 1
haptic([
  { duration: 30 },
  { delay: 60, duration: 40, intensity: 0.5 },
]);
```

The [demo site](https://ilyassesalama.github.io/vibration/) has a pattern composer that writes this code
for you.

### Sliders and drags

On iPhone, a tap plays a single tick. To tick at every step of a slider, picker or scrubber,
attach the element with `hapticDrag` and call `haptic()` as the value changes:

```ts
import { haptic, hapticDrag } from "vibration";

const detach = hapticDrag(slider);

slider.addEventListener("pointermove", () => {
  if (valueChanged()) haptic("selection");
});
```

In React, its cleanup function fits straight into an effect:

```tsx
useEffect(() => hapticDrag(sliderRef.current!), []);
```

Everywhere else `haptic()` already works during a drag, so `hapticDrag` does nothing there.
On iPhone:

- The first tick can play about 0.2 s into the drag, and ticks play while the finger moves.
- Touches on the element don't scroll the page or fire `click`. Pointer and touch events
  reach your handlers as usual.

## API

### `haptic(input = "medium"): boolean`

Plays haptic feedback. `input` is a preset name, a duration in milliseconds, an array of
on/off durations or an array of pulses. Returns `false` when nothing will play, for example
in a browser without haptics or, on iPhone, outside a tap. Throws a `TypeError` for invalid
input.

### `hapticDrag(element): () => void`

Lets `haptic()` tick repeatedly while a finger drags across `element`. Returns a function
that detaches it.

### `cancel(): void`

Stops a pattern that is still playing.

### `presets`

The built-in patterns, as arrays of pulses.

### `engine`

How this browser plays haptics: `"vibrate"` (Android), `"ios-relay"` (iOS 26.5+),
`"ios-switch"` (iOS 18 to 26.4) or `"none"`.

The package also exports the types `HapticInput`, `Pattern`, `Pulse`, `PresetName` and
`HapticEngine`.

## Browser support

| Platform | What you get |
| --- | --- |
| Android: Chrome, Edge, Samsung Internet and other Chromium browsers | Full patterns, with intensity |
| iPhone on iOS 26.5 and later, in any browser | One tick per tap, and a tick per step with `hapticDrag` |
| iPhone on iOS 18 to 26.4 | Patterns, played as a series of ticks (from 18.4, within a second of the tap) |
| Desktop, iPad, Firefox on Android, iOS 17 and older | Nothing. `haptic()` returns `false` |

## Good to know

- **On iPhone, call `haptic()` during the tap itself.** After an `await` or inside a timer,
  there's no tap left and it returns `false`. Android only needs one earlier tap on the page.
- **iOS 26.5 and later play one tick per tap.** A pattern's timing and intensity apply on
  Android and older iOS.
- **Icons inside buttons:** on iOS 26.5+, a tap that lands right on an `<img>`, `<svg>`,
  `<canvas>` or `<video>` can't carry a haptic. Let taps pass through to the button:

  ```css
  button svg, button img { pointer-events: none; }
  ```

- **Opting out:** on iOS 26.5+ the library steps into taps on your page (see
  [How it works](#how-it-works)). It skips text fields, `<select>` and editable content. Add
  `data-vibration-ignore` to skip anything else.
- **User settings win.** People can turn haptics off on their phone, and no web API can
  tell you.

## How it works

On **Android**, patterns go to the Vibration API. Intensity is emulated by pulsing the motor
on and off within each pulse.

**iPhones** have no vibration API. The one haptic Safari plays is the tick of a switch
(`<input type="checkbox" switch>`) being toggled. Up to iOS 26.4, a script could toggle a
hidden switch whenever it liked. iOS 26.5 only plays the tick when a real tap toggles it, so
the library borrows yours:

1. When a finger lifts, an invisible `<label>` is placed under it, inside the element you
   tapped. The tap's click lands on the label and bubbles through your element as usual.
2. If your click handler calls `haptic()`, the label gets a hidden switch, and your tap
   toggles it: one tick.
3. If no handler asks for a haptic, the label has no switch and does nothing. Links,
   forms and `preventDefault()` behave exactly as they would without the library.

`hapticDrag` uses the other way iOS plays the tick: a finger sliding a switch's thumb past
its middle. It keeps an invisible switch under the finger and shifts it so the next movement
crosses.

The library picks the right method by testing what the browser does, not by reading its
version number.

## Development

```sh
pnpm install
pnpm dev # builds the library and serves the demo site on your network
```

The library lives in `src/` and the demo site in `site/`. Scan the QR code on the demo
page to open it on your phone.

## License

[MIT](LICENSE)
