import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { hapticDrag, presets } from "vibration";
import { feedback } from "../lib/feedback";
import { reducedMotion } from "../lib/wave";
import styles from "./Ruler.module.css";

const STEPS = 20;
const START = 8;

/** A ruler you drag along. Every step it passes plays a tick: several haptics in one gesture, iPhone included. */
export function Ruler() {
  const track = useRef<HTMLDivElement>(null);
  const ticks = useRef<(HTMLSpanElement | null)[]>([]);
  const [step, setStep] = useState(START);
  const current = useRef(START);
  const dragging = useRef(false);

  // On iPhone, ticks during a drag need the drag to start on a hapticDrag surface.
  useEffect(() => hapticDrag(track.current!), []);

  const set = (next: number) => {
    const clamped = Math.min(STEPS, Math.max(0, next));
    if (clamped === current.current) return;
    current.current = clamped;
    setStep(clamped);
    feedback(presets.selection);
    if (!reducedMotion.matches) {
      ticks.current[clamped]?.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(1.9)" }, { transform: "scaleY(1)" }],
        { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current!.getBoundingClientRect();
    const inset = 18;
    set(Math.round(((event.clientX - box.left - inset) / (box.width - inset * 2)) * STEPS));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (event.key === "Home") set(0);
    else if (event.key === "End") set(STEPS);
    else if (event.key in moves) set(current.current + moves[event.key]!);
    else return;
    event.preventDefault();
  };

  return (
    <div className={styles.ruler}>
      <div className={styles.readout} aria-hidden="true">
        <span>{step}</span>
        <span className={styles.of}>of {STEPS} steps</span>
      </div>
      <div
        ref={track}
        className={styles.track}
        style={{ "--value": step / STEPS } as CSSProperties}
        role="slider"
        tabIndex={0}
        aria-label="Haptic ruler"
        aria-valuemin={0}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        onPointerDown={(event) => {
          dragging.current = true;
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) fromPointer(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
      >
        <div className={styles.fill} />
        <div className={styles.ticks} aria-hidden="true">
          {Array.from({ length: STEPS + 1 }, (_, index) => (
            <span
              key={index}
              ref={(element) => {
                ticks.current[index] = element;
              }}
              data-major={index % 5 === 0}
              data-passed={index <= step}
            />
          ))}
        </div>
        <div className={styles.needle} />
      </div>
    </div>
  );
}
