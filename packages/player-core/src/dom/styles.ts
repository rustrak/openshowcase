const injected = new WeakMap<Document, Set<string>>();

/**
 * Adds `css` to `doc` as a <style> tag, once per `id`. Components call it when they're
 * created (never at import time), so importing the package has no side effects.
 */
export function injectStyles(doc: Document, id: string, css: string): void {
  let ids = injected.get(doc);
  if (!ids) {
    ids = new Set();
    injected.set(doc, ids);
  }
  if (ids.has(id)) return;
  ids.add(id);
  const style = doc.createElement("style");
  style.dataset.openshowcase = id;
  style.textContent = css;
  doc.head.appendChild(style);
}
