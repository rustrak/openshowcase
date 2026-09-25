/**
 * Chrome never lets an extension capture or inject into browser UI, other extensions
 * or the Web Store. Recording there fails, so the popup says so up front.
 */
export function isRecordableUrl(url: string | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const isWebStore =
    parsed.hostname === "chromewebstore.google.com" ||
    (parsed.hostname === "chrome.google.com" &&
      parsed.pathname.startsWith("/webstore"));
  return !isWebStore;
}

/** Hostname without `www.`, or the raw URL if it doesn't parse. */
export function displayHost(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Elapsed recording time: `m:ss`, or `h:mm:ss` past an hour. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** `just now`, `5 min ago`, `yesterday`… — coarse on purpose, it labels a list. */
export function formatRelativeTime(then: number, now: number): string {
  const seconds = Math.round((then - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}
