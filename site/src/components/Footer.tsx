import { Vibrate } from "@phosphor-icons/react";
import styles from "./Footer.module.css";
import { REPO } from "./Nav";

export function Footer() {
  return (
    <footer className="page">
      <div className={styles.footer}>
        <span className={styles.brand}>
          <Vibrate size={20} weight="bold" />
          vibration
        </span>
        <nav className={styles.links} aria-label="Project">
          <a href="https://www.npmjs.com/package/vibration">npm</a>
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}/blob/main/LICENSE`}>MIT license</a>
        </nav>
      </div>
    </footer>
  );
}
