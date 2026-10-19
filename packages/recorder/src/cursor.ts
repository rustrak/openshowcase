import type { BrowserContext } from "playwright";

/**
 * Headless Chromium draws no cursor, while a recording made by hand has Chrome's own cursor
 * burned in. This puts one in the page, following the (real, CDP-driven) mouse, with a ripple
 * on press. Built with DOM APIs only (no HTML strings, no style attributes) so a page's CSP
 * or Trusted Types don't block it, and in a shadow root so the page's CSS doesn't touch it.
 */
export async function installCursor(context: BrowserContext): Promise<void> {
  await context.addInitScript(cursorScript);
}

function cursorScript() {
  // ponytail: top frame only; over an iframe the cursor stops until the mouse leaves it.
  if (window.top !== window) return;
  const KEY = "openshowcase-cursor";
  const SVG = "http://www.w3.org/2000/svg";

  const host = document.createElement("openshowcase-cursor");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;opacity:0;";
  const root = host.attachShadow({ mode: "open" });

  const ripple = document.createElement("div");
  ripple.style.cssText =
    "position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;background:rgba(20,20,20,.18);border:2px solid rgba(255,255,255,.9);box-sizing:border-box;opacity:0;";

  // A macOS-style arrow, tip at (0, 0).
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "30");
  svg.setAttribute("viewBox", "-1 -1 15 21");
  svg.style.cssText =
    "position:absolute;left:-1.5px;top:-1.5px;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35));transform-origin:2px 2px;";
  const arrow = document.createElementNS(SVG, "path");
  arrow.setAttribute(
    "d",
    "M0 0 L0 16 L4 12.3 L6.8 18.6 L9.3 17.5 L6.6 11.4 L11.8 11.4 Z",
  );
  arrow.setAttribute("fill", "#111");
  arrow.setAttribute("stroke", "#fff");
  arrow.setAttribute("stroke-width", "1.3");
  arrow.setAttribute("stroke-linejoin", "round");
  svg.append(arrow);
  root.append(ripple, svg);

  const place = (x: number, y: number) => {
    host.style.transform = `translate(${x}px, ${y}px)`;
    host.style.opacity = "1";
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ x, y }));
    } catch {
      /* storage off: the cursor reappears on the next move */
    }
  };
  // Where the cursor was before this page load (same tab, same origin).
  try {
    const last = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (last) place(last.x, last.y);
  } catch {
    /* no previous position */
  }

  addEventListener("mousemove", (e) => place(e.clientX, e.clientY), {
    capture: true,
    passive: true,
  });
  addEventListener(
    "mousedown",
    (e) => {
      place(e.clientX, e.clientY);
      svg.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.85)" },
          { transform: "scale(1)" },
        ],
        { duration: 220, easing: "ease-out" },
      );
      ripple.animate(
        [
          { opacity: 1, transform: "scale(.3)" },
          { opacity: 0, transform: "scale(1.3)" },
        ],
        { duration: 450, easing: "cubic-bezier(.2,.7,.3,1)" },
      );
    },
    { capture: true, passive: true },
  );

  // Under <html>, not <body>: frameworks re-render the body. Re-attach if something removes it.
  const mount = () => {
    if (document.documentElement && !host.isConnected)
      document.documentElement.append(host);
  };
  mount();
  document.addEventListener("readystatechange", mount);
  new MutationObserver(mount).observe(document, {
    childList: true,
    subtree: false,
  });
}
