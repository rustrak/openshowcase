/**
 * Pointer-captured drag: after pointerdown, every move/up on the page is routed to the
 * element that started the drag (so it keeps tracking when the pointer leaves it), and all
 * listeners are removed on release or cancel.
 */
export function startPointerDrag(
  e: React.PointerEvent,
  handlers: {
    onMove: (e: PointerEvent) => void;
    onEnd?: (e: PointerEvent) => void;
  },
) {
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  const onMove = (event: PointerEvent) => handlers.onMove(event);
  const onEnd = (event: PointerEvent) => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerup", onEnd);
    target.removeEventListener("pointercancel", onEnd);
    handlers.onEnd?.(event);
  };
  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerup", onEnd);
  target.addEventListener("pointercancel", onEnd);
}
