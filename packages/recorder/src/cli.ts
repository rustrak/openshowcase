import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { BUNDLED_EXTENSION_DIR, DEFAULT_PROFILE_DIR } from "./browser";
import { loadFlow } from "./flow";
import { formatInspection, inspect } from "./inspect";
import { BUNDLED_SKILL_DIR, installSkill } from "./install-skill";
import { login } from "./login";
import { openInStudio } from "./open";
import { record } from "./record";

export const USAGE = `openshowcase-recorder: record an OpenShowcase demo from a scripted flow

Usage:
  openshowcase-recorder inspect <flow.json|url> [--within <css>] [--screenshot <png>]
      Run the flow fast, without recording, and print where it ends up: URL and
      the accessibility tree (roles and names for targets), only the part
      matching --within if given. A failing step is reported, with the page as
      it was when it failed. --screenshot also saves an image of it.
  openshowcase-recorder record <flow.json> [--out <file.osrec>] [--open]
      Record the flow in a headless Chromium, paced for the camera, with a
      visible cursor. --open then opens it for review (see open).
  openshowcase-recorder open <file.osrec>
      Open a recording in the OpenShowcase editor, in a separate review browser
      that stays open (your recordings are kept there). Returns right away.
  openshowcase-recorder login <url>
      Open a window on the recording profile to sign in once. Close it when done.

Steps really run against the app, so whatever they change on its server stays
changed. Browser state (localStorage, cookies) doesn't: inspect and record run on
a throwaway copy of the profile, so every run starts from what login saved.
  openshowcase-recorder install-skill [--dir <project>]
      Install the Claude Code skill into <project>/.claude/skills.

Options:
  --profile <dir>     Browser profile (logins) to use. Default: ${DEFAULT_PROFILE_DIR}
  --extension <dir>   A built OpenShowcase extension to record with (default: bundled)
  --headed            Show the browser window
  -h, --help          Show this help`;

export class UsageError extends Error {
  override readonly name = "UsageError";
}

interface BrowserOptions {
  profileDir: string;
  extensionDir: string;
  headed: boolean;
}

export type Command =
  | { command: "help" }
  | ({
      command: "record";
      flow: string;
      out: string;
      open: boolean;
    } & BrowserOptions)
  | { command: "open"; file: string; extensionDir: string }
  | ({
      command: "inspect";
      flow: string;
      screenshot?: string;
      within?: string;
    } & BrowserOptions)
  | ({ command: "login"; url: string } & BrowserOptions)
  | { command: "install-skill"; projectDir: string };

const expandHome = (path: string) =>
  path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path;

export function parseCommand(argv: string[]): Command {
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(argv);
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  const { values, positionals } = parsed;
  const [command, arg] = positionals;
  if (values.help || !command) return { command: "help" };

  const browser: BrowserOptions = {
    profileDir: resolve(expandHome(values.profile ?? DEFAULT_PROFILE_DIR)),
    extensionDir: values.extension
      ? resolve(expandHome(values.extension))
      : BUNDLED_EXTENSION_DIR,
    headed: values.headed ?? false,
  };

  switch (command) {
    case "record": {
      if (!arg) throw new UsageError("record needs a flow file");
      const out =
        values.out ??
        `${basename(arg, extname(arg)).replace(/\.flow$/, "") || "recording"}.osrec`;
      return {
        command,
        flow: arg,
        out: resolve(out),
        ...browser,
        open: values.open ?? false,
      };
    }
    case "open":
      if (!arg) throw new UsageError("open needs a recording (.osrec)");
      return {
        command,
        file: resolve(arg),
        extensionDir: browser.extensionDir,
      };
    case "inspect":
      if (!arg) throw new UsageError("inspect needs a flow file or a URL");
      return {
        command,
        flow: arg,
        ...(values.screenshot && { screenshot: resolve(values.screenshot) }),
        ...(values.within && { within: values.within }),
        ...browser,
      };
    case "login":
      if (!arg) throw new UsageError("login needs the URL to sign in at");
      return { command, url: arg, ...browser };
    case "install-skill":
      return {
        command,
        projectDir: resolve(values.dir ?? process.cwd()),
      };
    default:
      throw new UsageError(`Unknown command "${command}"`);
  }
}

function parse(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      screenshot: { type: "string" },
      within: { type: "string" },
      profile: { type: "string" },
      extension: { type: "string" },
      dir: { type: "string" },
      headed: { type: "boolean" },
      open: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
}

/** Runs a command; resolves with the process exit code. */
export async function run(argv: string[]): Promise<number> {
  const log = (line: string) => process.stdout.write(`${line}\n`);
  let command: Command;
  try {
    command = parseCommand(argv);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n\n${USAGE}\n`);
    return 2;
  }

  try {
    switch (command.command) {
      case "help":
        log(USAGE);
        return 0;
      case "record": {
        const flow = await loadFlow(command.flow);
        const result = await record(flow, { ...command, log });
        log(`Recorded → ${result.out} (${(result.bytes / 1e6).toFixed(1)} MB)`);
        log(
          `Demo: ${result.hotspots} hotspot steps, about ${Math.round(result.videoSec)}s of video after cutting ${Math.round(result.cutSec)}s of waiting.`,
        );
        if (command.open) {
          await openInStudio(result.out, command);
          log("Opened in the review browser.");
        } else log(`Review it: openshowcase-recorder open ${result.out}`);
        return 0;
      }
      case "open":
        await openInStudio(command.file, command);
        log(`Opened ${command.file} in the review browser.`);
        return 0;
      case "inspect": {
        const flow = await loadFlow(command.flow);
        const inspection = await inspect(flow, command);
        log(formatInspection(inspection));
        return inspection.error ? 1 : 0;
      }
      case "login":
        log(`Sign in in the window that opened, then close it.`);
        await login(command.url, command);
        log(`Saved to the profile at ${command.profileDir}`);
        return 0;
      case "install-skill":
        log(
          `Installed ${await installSkill(command.projectDir, BUNDLED_SKILL_DIR)}`,
        );
        return 0;
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
}
