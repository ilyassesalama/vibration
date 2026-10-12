import { useEffect, useRef, useState } from "react";
import { haptic } from "vibration";

/** Copies `text` with a light haptic. `copied` stays true for a moment after. */
export function useCopy(text: string): [copied: boolean, copy: () => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can be denied; the text stays on screen to select.
    }
  };

  return [copied, copy];
}
