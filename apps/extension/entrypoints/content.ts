import {
  type MarkerKind,
  type MarkerPayload,
  sendMessage,
} from "@/lib/messaging";
import { eventEpochMs, pressTimeForClick } from "@/lib/press-timing";
import { getCssSelector } from "@/lib/selector";

/** Max rate of activity markers (scroll/type/drag), per kind. */
const ACTIVITY_THROTTLE_MS = 400;
const ELEMENT_TEXT_MAX = 60;

function readElementText(el: Element): string | undefined {
  const aria = el.getAttribute("aria-label") ?? el.getAttribute("title");
  const candidate =
    aria ||
    (el as HTMLElement).innerText ||
    (el as HTMLInputElement).value ||
    el.getAttribute("alt");
  const text = candidate?.trim().replace(/\s+/g, " ");
  if (!text) return undefined;
  return text.length > ELEMENT_TEXT_MAX
    ? `${text.slice(0, ELEMENT_TEXT_MAX - 1)}…`
    : text;
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    const send = (payload: MarkerPayload) => {
      if (ctx.isInvalid) return;
      sendMessage("marker", payload).catch(() => {
        // outside of recording (or service worker asleep) it's expected to fail; not an error
      });
    };

    // All times come from the events' own timestamps (see lib/press-timing.ts), on the same
    // clock the offscreen document anchors the recording's t=0 to.
    const lastSentByKind: Partial<Record<MarkerKind, number>> = {};
    const sendActivity = (kind: Exclude<MarkerKind, "click">, event: Event) => {
      const at = eventEpochMs(event);
      if (at - (lastSentByKind[kind] ?? 0) < ACTIVITY_THROTTLE_MS) return;
      lastSentByKind[kind] = at;
      send({ kind, capturedAt: at, pageUrl: location.href });
    };

    // The press (pointerdown) is when a click "happens" for the demo — see pressTimeForClick.
    // It's only reported once the matching `click` confirms it was a click (not a drag).
    let press: { at: number; x: number; y: number } | undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      press = { at: eventEpochMs(event), x: event.clientX, y: event.clientY };
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const at = pressTimeForClick(press, eventEpochMs(event));
      const fromPress = press && at === press.at;
      const x = fromPress && press ? press.x : event.clientX;
      const y = fromPress && press ? press.y : event.clientY;
      press = undefined;
      send({
        kind: "click",
        capturedAt: at,
        pageUrl: location.href,
        selector: getCssSelector(target),
        xFrac: x / window.innerWidth,
        yFrac: y / window.innerHeight,
        elementText: readElementText(target),
      });
    };
    const handleScroll = (event: Event) => sendActivity("scroll", event);
    const handleKeydown = (event: Event) => sendActivity("type", event);
    const handleDragstart = (event: Event) => sendActivity("drag", event);
    const handlePointerMove = (event: PointerEvent) => {
      if (event.buttons === 1) sendActivity("drag", event);
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("wheel", handleScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", handleKeydown, { capture: true });
    document.addEventListener("dragstart", handleDragstart, {
      capture: true,
    });
    document.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: true,
    });

    // An extension update/reload orphans this content script — it keeps running (the page
    // isn't reloaded) but every sendMessage would throw "Extension context invalidated" forever.
    // Detach everything instead of leaking listeners that silently fail on every event.
    ctx.onInvalidated(() => {
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("scroll", handleScroll, { capture: true });
      document.removeEventListener("wheel", handleScroll, { capture: true });
      document.removeEventListener("keydown", handleKeydown, {
        capture: true,
      });
      document.removeEventListener("dragstart", handleDragstart, {
        capture: true,
      });
      document.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
    });
  },
});
