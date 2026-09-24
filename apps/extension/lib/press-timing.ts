/**
 * Wall-clock (epoch ms) time an event actually happened — not when its (possibly busy)
 * handler got to run: `Date.now()` minus how long ago the event fired, measured on this
 * context's own monotonic clock (`performance.now() - event.timeStamp`).
 *
 * Never use `performance.timeOrigin + <high-res time>` to compare times across contexts:
 * the monotonic clock stops while the machine sleeps, so in a tab opened hours ago it lags
 * the real clock by minutes, while the offscreen document that anchors the recording is
 * brand new. `Date.now()` is the only clock every context agrees on.
 */
export function eventEpochMs(
  event: { timeStamp: number },
  nowMs: number = Date.now(),
  perfNow: number = performance.now(),
): number {
  return nowMs - Math.max(0, perfNow - event.timeStamp);
}

/** A press older than this before its click belongs to another gesture (e.g. a long drag). */
const MAX_PRESS_TO_CLICK_MS = 1500;

/**
 * When a click "happened" for the demo: the press (pointerdown). Many widgets react on
 * pointerdown — menus open, tabs switch, :active styles apply — so by the time `click` fires
 * on release the screen has already changed; the photo step must show the moment before.
 */
export function pressTimeForClick(
  press: { at: number } | undefined,
  clickAt: number,
): number {
  if (
    !press ||
    clickAt - press.at > MAX_PRESS_TO_CLICK_MS ||
    press.at > clickAt
  )
    return clickAt;
  return press.at;
}
