export async function blobToWebp(source: Blob, quality = 0.85): Promise<Blob> {
  if (source.type === "image/webp") return source;
  const bitmap = await createImageBitmap(source);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context for image conversion");
  ctx.drawImage(bitmap, 0, 0);
  return canvas.convertToBlob({ type: "image/webp", quality });
}
