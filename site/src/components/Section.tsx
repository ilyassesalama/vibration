import type { ReactNode } from "react";
import { useReveal } from "../lib/useReveal";

/** A page section with a title and lede, fading up the first time it scrolls into view. */
export function Section({ id, title, lede, children }: { id?: string; title: string; lede: ReactNode; children: ReactNode }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id={id} className="page section reveal">
      <h2 className="section-title">{title}</h2>
      <p className="section-lede">{lede}</p>
      {children}
    </section>
  );
}
