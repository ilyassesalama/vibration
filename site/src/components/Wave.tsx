import { type Ref, useImperativeHandle, useMemo, useRef } from "react";
import type { Pattern } from "vibration";
import { playTrace, tracePath } from "../lib/wave";
import styles from "./Wave.module.css";

export interface WaveHandle {
  play(): void;
}

export function Wave({ pattern, ref }: { pattern: Pattern; ref?: Ref<WaveHandle> }) {
  const lit = useRef<SVGSVGElement>(null);
  const path = useMemo(() => tracePath(pattern, 200, 40), [pattern]);

  useImperativeHandle(ref, () => ({ play: () => lit.current && playTrace(lit.current, pattern) }), [pattern]);

  return (
    <span className={styles.wave} aria-hidden="true">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className={styles.base}>
        <path d={path} />
      </svg>
      <svg ref={lit} viewBox="0 0 200 40" preserveAspectRatio="none" className={styles.lit}>
        <path d={path} />
      </svg>
    </span>
  );
}
