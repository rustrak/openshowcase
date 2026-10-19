/** Minimal zip writer for tests: local headers + data + central directory, like JSZip STORE. */
export function makeZip(
  files: {
    name: string;
    data: string | Uint8Array;
    method?: number;
    flags?: number;
  }[],
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data =
      typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(6, file.flags ?? 0, true);
    lv.setUint16(8, file.method ?? 0, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const end = new Uint8Array(22);
  new DataView(end.buffer).setUint32(0, 0x06054b50, true);
  return concat([...locals, ...centrals, end]);
}

/** A stream delivering `bytes` in chunks of `chunkSize` (to exercise reads across chunks). */
export function streamOf(
  bytes: Uint8Array<ArrayBuffer>,
  chunkSize = bytes.length,
): ReadableStream<Uint8Array<ArrayBuffer>> & { pulled: () => number } {
  let at = 0;
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>(
    {
      pull(controller) {
        if (at >= bytes.length) return controller.close();
        controller.enqueue(bytes.slice(at, at + chunkSize));
        at += chunkSize;
      },
    },
    { highWaterMark: 0 },
  );
  return Object.assign(stream, { pulled: () => Math.min(at, bytes.length) });
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
