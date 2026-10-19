import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extensionIdForPath } from "../../browser";
import { openInStudio } from "../../open";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "studio-test-"));
  const extensionDir = join(dir, "built-extension");
  mkdirSync(extensionDir);
  writeFileSync(join(extensionDir, "manifest.json"), "{}");
  const file = join(dir, "Factura de venta.osrec");
  writeFileSync(file, "OSREC…");
  return { dir, extensionDir, file, studioDir: join(dir, "studio") };
}

describe("openInStudio", () => {
  it("opens the recording in the editor of a separate, lasting browser", async () => {
    const { extensionDir, file, studioDir } = fixture();
    const calls: { command: string; args: string[]; detached?: boolean }[] = [];
    const url = await openInStudio(file, {
      extensionDir,
      studioDir,
      executablePath: "/bin/chromium",
      spawn: (command, args, options) => {
        calls.push({ command, args, detached: options.detached });
        return { unref: () => {} };
      },
    });

    const studioExtension = join(studioDir, "extension");
    // The extension gets its own copy, with the recording inside it.
    expect(existsSync(join(studioExtension, "manifest.json"))).toBe(true);
    expect(
      readFileSync(
        join(studioExtension, "imports", "Factura-de-venta.osrec"),
        "utf8",
      ),
    ).toBe("OSREC…");

    const id = extensionIdForPath(realpathSync(studioExtension));
    expect(url).toBe(
      `chrome-extension://${id}/editor.html?import=imports/Factura-de-venta.osrec`,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("/bin/chromium");
    expect(calls[0]?.detached).toBe(true);
    expect(calls[0]?.args).toContain(
      `--user-data-dir=${join(studioDir, "profile")}`,
    );
    expect(calls[0]?.args).toContain(
      `--load-extension=${realpathSync(studioExtension)}`,
    );
    expect(calls[0]?.args.at(-1)).toBe(url);
  });

  it("only keeps the latest import", async () => {
    const { extensionDir, file, studioDir, dir } = fixture();
    const spawn = () => ({ unref: () => {} });
    const other = join(dir, "other.osrec");
    writeFileSync(other, "x");
    await openInStudio(other, { extensionDir, studioDir, spawn });
    await openInStudio(file, { extensionDir, studioDir, spawn });
    expect(
      existsSync(join(studioDir, "extension", "imports", "other.osrec")),
    ).toBe(false);
  });

  it("refuses a file that isn't a recording", async () => {
    const { extensionDir, studioDir, dir } = fixture();
    const notes = join(dir, "notes.txt");
    writeFileSync(notes, "x");
    await expect(
      openInStudio(notes, {
        extensionDir,
        studioDir,
        spawn: () => ({ unref: () => {} }),
      }),
    ).rejects.toThrow(/\.osrec/);
  });
});
