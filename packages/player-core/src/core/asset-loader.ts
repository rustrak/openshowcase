/** Prefixes a relative asset src (image/video) with the bundle's base URL, leaving absolute/data/blob URLs untouched. */
export function resolveAssetUrl(src: string, base?: string): string {
  if (
    !base ||
    /^https?:\/\//.test(src) ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  )
    return src;
  return `${base.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
}

export interface ResolvedVideoSrc {
  src: string;
  /** Set when a blob: URL was created for this src — caller must revoke it on cleanup/unmount. */
  objectUrl?: string;
}

/**
 * A .webm produced by MediaRecorder in chunks doesn't always carry Cues/duration in its
 * header, so serving it as a plain static file can hang indefinitely in Chrome. Downloading
 * it in full and using a blob: URL is what loads reliably.
 */
export async function loadVideoSrc(
  src: string,
  assetBaseUrl?: string,
): Promise<ResolvedVideoSrc> {
  const url = resolveAssetUrl(src, assetBaseUrl);
  if (url.startsWith("blob:") || url.startsWith("data:")) return { src: url };

  try {
    const blob = await (await fetch(url)).blob();
    const objectUrl = URL.createObjectURL(blob);
    return { src: objectUrl, objectUrl };
  } catch {
    // fetch doesn't work over file:// — let the <video> element load it directly.
    return { src: url };
  }
}
