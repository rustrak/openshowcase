const seconds = (value: number) => value.toFixed(1);

const minutes = (value: number) => {
  const whole = Math.floor(value);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/**
 * "1.2 / 2.3s", or "0:12 / 1:05" for a clip of a minute or more. Tenths for short clips: the
 * clips of a demo tend to last a second or two, and "0:01 / 0:02" would barely move.
 */
export function formatClipTime(elapsedSec: number, totalSec: number): string {
  const elapsed = Math.min(Math.max(0, elapsedSec), totalSec);
  return totalSec < 60
    ? `${seconds(elapsed)} / ${seconds(totalSec)}s`
    : `${minutes(elapsed)} / ${minutes(totalSec)}`;
}
