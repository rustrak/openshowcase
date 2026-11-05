import { realpathSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { extensionIdForPath, launch } from "./browser";

/** Encoding a long recording takes a while: this only has to catch a stuck one. */
const EXPORT_TIMEOUT_MS = 10 * 60 * 1000;

/** Nothing to sign in to here, so no profile: `launch` runs on an empty copy of this. */
const NO_PROFILE = join(tmpdir(), "openshowcase-no-profile");

export interface ExportOptions {
  extensionDir: string;
  headed: boolean;
  /** `.openshowcase`, or `.zip` to unpack next to the site's static files. */
  out: string;
  log?: (line: string) => void;
}

/**
 * Builds the demo of a recording, as is, and saves it at `out`: imports it in the extension's
 * real editor, in a headless browser, and clicks its Export. So there's one way to export, and
 * this file is the same as a person's download: same step plan, same encoders.
 */
export async function exportDemo(
  file: string,
  options: ExportOptions,
): Promise<{ out: string; bytes: number }> {
  if (!file.endsWith(".osrec"))
    throw new Error(`${file} is not a recording (.osrec)`);
  await stat(file).catch(() => {
    throw new Error(`There's no recording at ${file}`);
  });
  await mkdir(dirname(options.out), { recursive: true });

  const { context, close } = await launch({
    profileDir: NO_PROFILE,
    extensionDir: options.extensionDir,
    headless: !options.headed,
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    // Encoding the video can fail over to shipping the whole recording: worth knowing about
    page.on("console", (message) => {
      if (message.text().startsWith("[openshowcase:export]"))
        options.log?.(`Warning: ${message.text()}`);
    });
    const id = extensionIdForPath(realpathSync(options.extensionDir));
    await page.goto(`chrome-extension://${id}/editor.html`);
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.waitForURL(/recordingId=/);

    // Enabled once every photo step has its frame
    await page
      .getByRole("button", { name: "Export", exact: true })
      .click({ timeout: EXPORT_TIMEOUT_MS });
    const format =
      extname(options.out) === ".zip" ? ".zip" : "Download .openshowcase";
    const [download] = await Promise.all([
      Promise.race([
        page.waitForEvent("download", { timeout: EXPORT_TIMEOUT_MS }),
        page
          .getByText("Export failed")
          .waitFor({ timeout: EXPORT_TIMEOUT_MS })
          .then(async () => {
            const toast = await page.locator("[data-sonner-toast]").innerText();
            throw new Error(toast.replace(/\s*\n\s*/g, ": "));
          }),
      ]),
      page.getByRole("button", { name: format, exact: true }).click(),
    ]);
    await download.saveAs(options.out);
    return { out: options.out, bytes: (await stat(options.out)).size };
  } finally {
    await close();
  }
}
