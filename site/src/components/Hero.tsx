import { Check, Copy, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import type { PresetName } from "vibration";
import { deviceNote } from "../lib/feedback";
import { useSound } from "../lib/sound";
import { useCopy } from "../lib/useCopy";
import styles from "./Hero.module.css";
import { IconSwap } from "./IconSwap";
import { PresetKey } from "./PresetKey";

const PAD: PresetName[] = ["success", "nudge", "error", "buzz"];
const INSTALL = "npm i vibration";

export function Hero() {
  return (
    <section className={`page ${styles.hero}`}>
      <div className={styles.copy}>
        <h1 className={styles.title}>Haptics for the mobile web</h1>
        <p className={styles.lede}>
          One function vibrates Android phones and iPhones, iOS 26.5 included. No setup and no components to mount.
        </p>
        <div className={styles.actions}>
          <InstallPill />
          <a className={styles.secondary} href="#how">
            How it works on iPhone
          </a>
        </div>
      </div>
      <Pad />
    </section>
  );
}

function InstallPill() {
  const [copied, copy] = useCopy(INSTALL);
  return (
    <>
      <button type="button" className={styles.install} onClick={copy} aria-label={`Copy ${INSTALL}`}>
        <code>
          <span className={styles.prompt}>$</span> {INSTALL}
        </code>
        <IconSwap on={copied} onIcon={<Check size={18} weight="bold" />} offIcon={<Copy size={18} weight="bold" />} />
      </button>
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

function Pad() {
  const [sound, setSound] = useSound();
  return (
    <div className={styles.pad}>
      <div className={styles.padHead}>
        <span>Tap to feel it</span>
        <button
          type="button"
          className={styles.sound}
          aria-pressed={sound}
          onClick={() => setSound(!sound)}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
        >
          <IconSwap on={sound} onIcon={<SpeakerHigh size={18} weight="bold" />} offIcon={<SpeakerSlash size={18} weight="bold" />} />
          Sound
        </button>
      </div>
      <div className={styles.keys}>
        {PAD.map((name) => (
          <PresetKey key={name} name={name} size="large" />
        ))}
      </div>
      <p className={styles.note}>{deviceNote}</p>
    </div>
  );
}
