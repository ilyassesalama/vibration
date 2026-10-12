import { DeviceMobile, GithubLogo, Vibrate } from "@phosphor-icons/react";
import styles from "./Nav.module.css";
import { QrCode } from "./QrCode";

export const REPO = "https://github.com/ilyassesalama/vibration";

const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
// In development, point phones at this machine's network address instead of localhost.
const shareUrl = local && __LAN_URL__ ? `${__LAN_URL__}${location.pathname}` : location.href.split("#")[0]!;

export function Nav() {
  return (
    <header className={`page ${styles.nav}`}>
      <a href={import.meta.env.BASE_URL} className={styles.brand} aria-label="vibration, home">
        <Vibrate size={24} weight="bold" />
        <span>vibration</span>
      </a>
      <div className={styles.actions}>
        <button type="button" className={styles.phone} popoverTarget="open-on-phone">
          <DeviceMobile size={18} weight="bold" />
          Open on phone
        </button>
        <a className={styles.icon} href={REPO} aria-label="GitHub repository">
          <GithubLogo size={22} weight="bold" />
        </a>
      </div>
      <div id="open-on-phone" popover="auto" className={styles.popover}>
        <div className={styles.qr}>
          <QrCode value={shareUrl} size={164} />
        </div>
        <p className={styles.scan}>Scan with your phone's camera to feel it.</p>
        {local && !__LAN_URL__ && <p className={styles.hint}>Open this page from your network address to try it on a phone.</p>}
      </div>
    </header>
  );
}
