/**
 * The relay's <label> sits between the tapped element and its ancestors, which keeps some
 * of them from acting on the tap's click:
 * - <summary> and <label> ignore clicks on interactive content inside them, and a label
 *   is interactive content.
 * - Once the label has played a tick, it has handled the click, so links don't follow it.
 *
 * Buttons act on the DOMActivate event the click's target dispatches, which still reaches
 * them. This runs the rest, for the innermost element in the path that acts on clicks.
 */
export function activate(path: readonly EventTarget[], clickHandled: boolean): void {
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    const href = linkTarget(node);
    if (href !== null) {
      if (clickHandled) followLink(href, node);
      return;
    }
    if (node instanceof HTMLButtonElement) return;
    if (node.localName === "summary") {
      const details = node.parentElement;
      if (details instanceof HTMLDetailsElement && details.querySelector(":scope > summary") === node) {
        details.open = !details.open;
        return;
      }
    }
    if (node instanceof HTMLLabelElement) {
      activateLabel(node);
      return;
    }
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const LINK_ATTRIBUTES = ["target", "download", "rel", "referrerpolicy", "hreflang", "type", "ping"];

function linkTarget(node: Element): string | null {
  if ((node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement) && node.hasAttribute("href")) return node.href;
  if (node.localName === "a" && node.namespaceURI === SVG_NS) {
    const href = node.getAttribute("href") ?? node.getAttributeNS(XLINK_NS, "href");
    if (href) return new URL(href, node.baseURI).href;
  }
  return null;
}

function followLink(href: string, source: Element): void {
  // A detached copy has no listeners, so clicking it only follows the link.
  const link = document.createElement("a");
  link.href = href;
  for (const name of LINK_ATTRIBUTES) {
    const value = source.getAttribute(name);
    if (value !== null) link.setAttribute(name, value);
  }
  link.click();
}

const TEXT_ENTRY = "input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=reset],[type=image],[type=file],[type=color],[type=range]),textarea,select";

function activateLabel(label: HTMLLabelElement): void {
  const { control } = label;
  if (!control) return;
  control.click();
  if (control.matches(TEXT_ENTRY)) control.focus();
}
