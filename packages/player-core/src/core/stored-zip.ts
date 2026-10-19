type Bytes = Uint8Array<ArrayBuffer>;

/** One file of a zip, read as its bytes arrive. */
export interface ZipEntry {
  name: string;
  /** The file's bytes, in the chunks they arrived in (pass them to `new Blob()` as is). */
  parts: Bytes[];
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
/** General-purpose flag bit 3: sizes come after the data, so the stream can't be split. */
const DATA_DESCRIPTOR_FLAG = 0x08;
const STORED = 0;

/**
 * Reads a zip front to back as it downloads, yielding each file as soon as its last byte
 * arrives: no need to wait for the central directory at the end of the file.
 *
 * Only reads the layout the OpenShowcase exporter writes: uncompressed (STORE) entries with
 * their sizes in the local headers. Stops at the central directory without downloading it.
 * Aborting `signal` cancels the stream, even while a read is waiting on the network.
 */
export async function* readStoredZip(
  stream: ReadableStream<Bytes>,
  signal?: AbortSignal,
): AsyncGenerator<ZipEntry> {
  const input = new ByteReader(stream.getReader());
  const cancel = () => input.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      const signature = view(await input.read(4)).getUint32(0, true);
      if (
        signature === CENTRAL_DIRECTORY_HEADER ||
        signature === END_OF_CENTRAL_DIRECTORY
      )
        return;
      if (signature !== LOCAL_FILE_HEADER)
        throw new Error("Not an OpenShowcase bundle (not a zip file)");

      const header = view(await input.read(26));
      const flags = header.getUint16(2, true);
      const method = header.getUint16(4, true);
      const size = header.getUint32(14, true);
      const nameLength = header.getUint16(22, true);
      const extraLength = header.getUint16(24, true);
      const name = new TextDecoder().decode(await input.read(nameLength));
      if (
        method !== STORED ||
        flags & DATA_DESCRIPTOR_FLAG ||
        size === 0xffffffff
      )
        throw new Error(
          `Unsupported zip entry "${name}": re-export the demo with OpenShowcase`,
        );
      await input.read(extraLength);
      const parts = await input.readParts(size);
      // Directory entries ("assets/") carry no data
      if (!name.endsWith("/")) yield { name, parts };
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    input.cancel();
  }
}

function view(bytes: Bytes): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Exact-length reads over a stream's chunks, copying only when a read spans chunks. */
class ByteReader {
  private chunk: Bytes = new Uint8Array(0);
  private offset = 0;

  constructor(private readonly reader: ReadableStreamDefaultReader<Bytes>) {}

  /** The next `length` bytes, as chunks (each a view into the stream's own buffers). */
  async readParts(length: number): Promise<Bytes[]> {
    const parts: Bytes[] = [];
    let missing = length;
    while (missing > 0) {
      if (this.offset === this.chunk.length) {
        const { done, value } = await this.reader.read();
        if (done) throw new Error("The demo bundle is truncated");
        this.chunk = value;
        this.offset = 0;
        continue;
      }
      const take = Math.min(missing, this.chunk.length - this.offset);
      parts.push(this.chunk.subarray(this.offset, this.offset + take));
      this.offset += take;
      missing -= take;
    }
    return parts;
  }

  /** The next `length` bytes, contiguous. */
  async read(length: number): Promise<Bytes> {
    const parts = await this.readParts(length);
    if (parts.length === 1 && parts[0]) return parts[0];
    const bytes = new Uint8Array(length);
    let at = 0;
    for (const part of parts) {
      bytes.set(part, at);
      at += part.length;
    }
    return bytes;
  }

  cancel(): void {
    this.reader.cancel().catch(() => {});
  }
}
