/** `mm:ss.hh` — fixed width so a ticking timecode doesn't jitter (pair with tabular-nums). */
export function formatClock(seconds: number): string {
  const hundredths = Math.floor(Math.max(0, seconds) * 100);
  const m = Math.floor(hundredths / 6000);
  const s = Math.floor((hundredths % 6000) / 100);
  const h = hundredths % 100;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}.${pad(h)}`;
}

/** Short clip length, e.g. `3.2s`. */
export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
