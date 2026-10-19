import { spawn as nodeSpawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import { extensionIdForPath } from "./browser";

/** A browser of its own for reviewing recordings: profile (editor's IndexedDB) + extension copy. */
export const STUDIO_DIR = join(homedir(), ".openshowcase", "studio");

export interface OpenOptions {
  extensionDir: string;
  studioDir?: string;
  executablePath?: string;
  spawn?: (
    command: string,
    args: string[],
    options: { detached: boolean; stdio: "ignore" },
  ) => { unref: () => void };
}

/**
 * Opens the recording in the extension's editor, in a separate Chromium that outlives this
 * command: a plain browser (not automated), so downloads and the playground work as usual and
 * recordings stay in its profile. The file goes into the studio's own copy of the extension,
 * which the editor imports from (`?import=`, see the extension's core/import-source.ts). If the
 * studio is already open, Chromium hands the URL to it as a new tab.
 */
export async function openInStudio(
  file: string,
  options: OpenOptions,
): Promise<string> {
  if (!file.endsWith(".osrec"))
    throw new Error(`${file} is not a recording (.osrec)`);
  const studioDir = options.studioDir ?? STUDIO_DIR;
  const extensionDir = join(studioDir, "extension");
  const imports = join(extensionDir, "imports");

  await rm(imports, { recursive: true, force: true });
  await cp(options.extensionDir, extensionDir, {
    recursive: true,
    force: true,
  });
  await mkdir(imports, { recursive: true });
  const name = basename(file).replace(/[^\w.-]/g, "-");
  await copyFile(file, join(imports, name));

  const realExtension = realpathSync(extensionDir);
  const url = `chrome-extension://${extensionIdForPath(realExtension)}/editor.html?import=imports/${name}`;
  const spawn = options.spawn ?? nodeSpawn;
  spawn(
    options.executablePath ?? chromium.executablePath(),
    [
      `--user-data-dir=${join(studioDir, "profile")}`,
      `--disable-extensions-except=${realExtension}`,
      `--load-extension=${realExtension}`,
      "--no-first-run",
      "--no-default-browser-check",
      url,
    ],
    { detached: true, stdio: "ignore" },
  ).unref();
  return url;
}
