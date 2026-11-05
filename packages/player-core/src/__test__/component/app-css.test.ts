import { describe, expect, it } from "vitest";

// app.css (loaded by setup.ts) lands in the host page and shares its layer names. An
// unprefixed `.relative` or `--ease-out` would override the host's own, so every name it
// emits must carry the player's prefix.
function styleRules(rules: Iterable<CSSRule>): CSSStyleRule[] {
  return [...rules].flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule];
    return rule instanceof CSSGroupingRule ? styleRules(rule.cssRules) : [];
  });
}

function layerRules(name: string): CSSStyleRule[] {
  const topLevel = [...document.styleSheets].flatMap((s) => [...s.cssRules]);
  return styleRules(
    topLevel.filter(
      (rule) => rule instanceof CSSLayerBlockRule && rule.name === name,
    ),
  );
}

describe("app.css", () => {
  it("emits only prefixed utilities", () => {
    const selectors = layerRules("utilities").map((r) => r.selectorText);
    expect(selectors).not.toEqual([]);
    expect(selectors.filter((s) => !s.startsWith(".osp\\:"))).toEqual([]);
  });

  it("emits only prefixed theme variables", () => {
    const names = layerRules("theme").flatMap((r) => [...r.style]);
    expect(names).not.toEqual([]);
    expect(names.filter((n) => !n.startsWith("--osp-"))).toEqual([]);
  });
});
