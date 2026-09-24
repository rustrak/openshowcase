/**
 * Rewrites MediaRecorder's WebM without re-encoding (packets are copied as-is), so the file
 * gets what MediaRecorder never writes: a Duration and a Cues index. Without them every seek
 * scans the file and decodes forward from a distant keyframe — slow, and in the player a
 * visible stale frame at each photo↔video cut. Falls back to the original blob on failure.
 */
export async function remuxForSeeking(blob: Blob): Promise<Blob> {
  try {
    const {
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Conversion,
      Input,
      Output,
      WebMOutputFormat,
    } = await import("mediabunny");
    const input = new Input({
      source: new BlobSource(blob),
      formats: ALL_FORMATS,
    });
    const target = new BufferTarget();
    const output = new Output({ format: new WebMOutputFormat(), target });
    const conversion = await Conversion.init({ input, output });
    if (!conversion.isValid) return blob;
    await conversion.execute();
    return target.buffer
      ? new Blob([target.buffer], { type: "video/webm" })
      : blob;
  } catch (error) {
    console.warn(
      "[openshowcase:offscreen] remux failed, keeping the raw recording",
      error,
    );
    return blob;
  }
}
