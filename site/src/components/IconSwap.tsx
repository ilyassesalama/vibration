import type { ReactNode } from "react";
import styles from "./IconSwap.module.css";

/** Two icons in one spot, cross-faded when `on` changes. */
export function IconSwap({ on, onIcon, offIcon }: { on: boolean; onIcon: ReactNode; offIcon: ReactNode }) {
  return (
    <span className={styles.swap} aria-hidden="true">
      <span data-shown={!on}>{offIcon}</span>
      <span data-shown={on}>{onIcon}</span>
    </span>
  );
}
