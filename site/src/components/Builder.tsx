import { Play, Plus, Trash } from "@phosphor-icons/react";
import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { haptic, type Pattern, type PresetName, presets, type Pulse } from "vibration";
import { feedback, segments } from "../lib/feedback";
import { titleCase, toneStyle } from "../lib/presets";
import { reducedMotion } from "../lib/wave";
import styles from "./Builder.module.css";
import { CodeBlock } from "./CodeBlock";

interface Block {
  id: number;
  start: number;
  duration: number;
  intensity: number;
}

const STEP = 5;
const MIN_DURATION = 5;
const NEW_DURATION = 40;
const NEW_GAP = 60;
const FADE = 160;
const snap = (ms: number) => Math.round(ms / STEP) * STEP;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toBlocks = (pattern: Pattern): Block[] => segments(pattern).map((segment, index) => ({ id: index + 1, ...segment }));
const nextId = (blocks: Block[]) => Math.max(0, ...blocks.map((block) => block.id)) + 1;

function toPattern(blocks: Block[]): Pulse[] {
  let end = 0;
  return blocks.map(({ start, duration, intensity }) => {
    const pulse: Pulse = { duration };
    if (start > end) pulse.delay = start - end;
    if (intensity < 1) pulse.intensity = Math.round(intensity * 100) / 100;
    end = start + duration;
    return pulse;
  });
}

function toCode(pattern: Pulse[]): string {
  const lines = pattern.map(({ delay, duration, intensity }) => {
    const fields = [delay ? `delay: ${delay}` : "", `duration: ${duration}`, intensity !== undefined ? `intensity: ${intensity}` : ""];
    return `  { ${fields.filter(Boolean).join(", ")} },`;
  });
  return `haptic([\n${lines.join("\n")}\n]);`;
}

interface Drag {
  id: number;
  mode: "move" | "resize";
  x: number;
  start: number;
  duration: number;
  msPerPx: number;
}

export function Builder() {
  const [blocks, setBlocks] = useState(() => toBlocks(presets.success));
  const [selectedId, setSelectedId] = useState<number | null>(blocks[0]?.id ?? null);
  const [preset, setPreset] = useState<PresetName | null>("success");
  const [frozenSpan, setFrozenSpan] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);

  const pattern = useMemo(() => toPattern(blocks), [blocks]);
  const end = blocks.reduce((max, block) => Math.max(max, block.start + block.duration), 0);
  const span = frozenSpan ?? Math.max(1000, Math.ceil((end + 120) / 200) * 200);
  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  const ticks = useMemo(() => {
    const step = span > 1600 ? 400 : 200;
    return Array.from({ length: Math.floor(span / step) + 1 }, (_, index) => index * step);
  }, [span]);

  const update = (id: number, change: Partial<Block>) => {
    setPreset(null);
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...change } : block)));
  };

  /** Room a block can move or grow into without overlapping its neighbors. */
  const room = (id: number) => {
    const index = blocks.findIndex((block) => block.id === id);
    const previous = blocks[index - 1];
    const next = blocks[index + 1];
    return { min: previous ? previous.start + previous.duration : 0, max: next ? next.start : Number.POSITIVE_INFINITY };
  };

  const loadPreset = (name: PresetName) => {
    const next = toBlocks(presets[name]);
    setBlocks(next);
    setSelectedId(next[0]?.id ?? null);
    setPreset(name);
    feedback(presets[name]);
  };

  const startDrag = (event: PointerEvent<HTMLElement>, block: Block, mode: Drag["mode"]) => {
    event.stopPropagation();
    if (!track.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = track.current.getBoundingClientRect().width;
    drag.current = { id: block.id, mode, x: event.clientX, start: block.start, duration: block.duration, msPerPx: span / width };
    setFrozenSpan(span);
    if (block.id !== selectedId) {
      haptic("selection");
      setSelectedId(block.id);
    }
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const delta = (event.clientX - current.x) * current.msPerPx;
    const { min, max } = room(current.id);
    if (current.mode === "move") {
      update(current.id, { start: clamp(snap(current.start + delta), min, max - current.duration) });
    } else {
      update(current.id, { duration: clamp(snap(current.duration + delta), MIN_DURATION, max - current.start) });
    }
  };

  const endDrag = () => {
    drag.current = null;
    setFrozenSpan(null);
  };

  const addAt = (event: PointerEvent<HTMLDivElement>) => {
    if (!track.current || event.target !== event.currentTarget) return;
    const box = track.current.getBoundingClientRect();
    const at = snap(((event.clientX - box.left) / box.width) * span);
    const index = blocks.findIndex((block) => block.start > at);
    const previous = index === -1 ? blocks.at(-1) : blocks[index - 1];
    const next = index === -1 ? undefined : blocks[index];
    const start = Math.max(at, previous ? previous.start + previous.duration : 0);
    const duration = Math.min(NEW_DURATION, (next?.start ?? Number.POSITIVE_INFINITY) - start);
    if (duration < 10) return;
    insert(start, duration);
  };

  const addAfter = () => {
    const last = blocks.at(-1);
    insert(last ? snap(last.start + last.duration + NEW_GAP) : 0, NEW_DURATION);
  };

  const insert = (start: number, duration: number) => {
    const block = { id: nextId(blocks), start, duration, intensity: 1 };
    setPreset(null);
    setBlocks([...blocks, block].sort((a, b) => a.start - b.start));
    setSelectedId(block.id);
    haptic("selection");
  };

  const onBlockKey = (event: KeyboardEvent, block: Block) => {
    if (event.key === "Delete" || event.key === "Backspace") return remove();
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const { min, max } = room(block.id);
    const delta = direction * (event.shiftKey ? 50 : 10);
    update(block.id, { start: clamp(snap(block.start + delta), min, max - block.duration) });
  };

  const remove = () => {
    if (!selected) return;
    const remaining = blocks.filter((block) => block.id !== selected.id);
    setPreset(null);
    setBlocks(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    haptic("rigid");
  };

  const play = () => {
    if (!pattern.length) return;
    feedback(pattern);
    if (reducedMotion.matches || !track.current) return;
    const distance = (track.current.clientWidth * end) / span;
    playhead.current?.animate(
      [
        { transform: "translateX(0)", opacity: 1 },
        { transform: `translateX(${distance}px)`, opacity: 1, offset: end / (end + FADE) },
        { transform: `translateX(${distance}px)`, opacity: 0 },
      ],
      { duration: end + FADE, easing: "linear" },
    );
  };

  return (
    <div className={styles.builder}>
      <div className={styles.toolbar}>
        <div className={styles.presets}>
          {(Object.keys(presets) as PresetName[]).map((name) => (
            <button
              key={name}
              type="button"
              className={styles.preset}
              style={toneStyle(name)}
              aria-pressed={preset === name}
              onClick={() => loadPreset(name)}
            >
              {titleCase(name)}
            </button>
          ))}
        </div>
        <button type="button" className={styles.play} onClick={play} disabled={!pattern.length}>
          <Play size={16} weight="fill" />
          Play
          <span className={styles.length}>{end}ms</span>
        </button>
      </div>

      <div>
        <div ref={track} className={styles.track} onPointerDown={addAt}>
          {ticks.map((tick) => (
            <span key={tick} className={styles.gridline} style={{ left: `${(tick / span) * 100}%` }} />
          ))}
          <span ref={playhead} className={styles.playhead} aria-hidden="true" />
          {blocks.map((block) => (
            <div
              key={block.id}
              className={styles.block}
              data-selected={block.id === selectedId}
              style={{ left: `${(block.start / span) * 100}%`, width: `${(block.duration / span) * 100}%` }}
              onPointerDown={(event) => startDrag(event, block, "move")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              role="button"
              tabIndex={0}
              aria-label={`Pulse at ${block.start}ms, ${block.duration}ms long, intensity ${Math.round(block.intensity * 100)}%`}
              aria-keyshortcuts="ArrowLeft ArrowRight Delete"
              onKeyDown={(event) => onBlockKey(event, block)}
              onFocus={() => setSelectedId(block.id)}
            >
              <span className={styles.body}>
                <span className={styles.fill} style={{ height: `${Math.max(12, block.intensity * 100)}%` }} />
              </span>
              {/* Sits just past the right edge, so short pulses can still be moved. Its pointer moves bubble to the block. */}
              <span className={styles.handle} onPointerDown={(event) => startDrag(event, block, "resize")} />
            </div>
          ))}
        </div>
        <div className={styles.axis}>
          {ticks.map((tick) => (
            <span key={tick} style={{ left: `${(tick / span) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.lower}>
        <div className={styles.controls}>
          {selected ? (
            <>
              <label className={styles.slider}>
                <span>Duration</span>
                <input
                  type="range"
                  min={MIN_DURATION}
                  max={Math.max(MIN_DURATION, Math.min(1000, room(selected.id).max - selected.start))}
                  step={STEP}
                  value={selected.duration}
                  onChange={(event) => update(selected.id, { duration: Number(event.target.value) })}
                />
                <output>{selected.duration}ms</output>
              </label>
              <label className={styles.slider}>
                <span>Intensity</span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={selected.intensity}
                  onChange={(event) => update(selected.id, { intensity: Number(event.target.value) })}
                />
                <output>{Math.round(selected.intensity * 100)}%</output>
              </label>
            </>
          ) : (
            <p className={styles.hint}>No pulses yet. Tap the timeline or add one.</p>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={addAfter}>
              <Plus size={16} weight="bold" />
              Add pulse
            </button>
            {selected && (
              <button type="button" className={`${styles.action} ${styles.remove}`} onClick={remove}>
                <Trash size={16} weight="bold" />
                Remove pulse
              </button>
            )}
          </div>
        </div>

        <CodeBlock code={pattern.length ? toCode(pattern) : "haptic([]);"} />
      </div>
    </div>
  );
}
