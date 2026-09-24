export function getCssSelector(el: Element): string {
  const path: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === Node.ELEMENT_NODE && path.length < 6) {
    if (node.id) {
      path.unshift(`#${CSS.escape(node.id)}`);
      break;
    }

    let selector = node.nodeName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.nodeName === node!.nodeName,
      );
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    path.unshift(selector);
    node = parent;
  }

  return path.join(" > ");
}
