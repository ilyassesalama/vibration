import { Check, Copy } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { haptic } from "vibration";
import styles from "./CodeBlock.module.css";

const TOKENS =
  /(\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|function|return|const|let|await|async)\b|(<\/?[a-zA-Z][\w-]*|\/?>)|\b(\d+(?:\.\d+)?)\b/gm;

/** Just enough highlighting to read the snippets on this page. */
function highlight(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKENS)) {
    const index = match.index;
    if (index > last) nodes.push(code.slice(last, index));
    const [text, stringOrComment, keyword, tag] = match;
    const kind = stringOrComment ? (stringOrComment.startsWith("//") ? "comment" : "string") : keyword ? "keyword" : tag ? "tag" : "number";
    nodes.push(
      <span key={index} className={styles[kind]}>
        {text}
      </span>,
    );
    last = index + text.length;
  }
  if (last < code.length) nodes.push(code.slice(last));
  return nodes;
}

export function CodeBlock({ code, prompt = false }: { code: string; prompt?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can be denied; the code is still selectable.
    }
  };

  return (
    <div className={styles.block}>
      <pre className={styles.code}>
        {prompt && <span className={styles.prompt}>$ </span>}
        <code>{highlight(code)}</code>
      </pre>
      <button type="button" className={styles.copy} onClick={copy} aria-label={copied ? "Copied" : "Copy code"}>
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
      </button>
    </div>
  );
}
