import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_EXTENSION_DIR, DEFAULT_PROFILE_DIR } from "../../browser";
import { parseCommand, UsageError } from "../../cli";

describe("parseCommand", () => {
  it("records a flow to a file named after it by default", () => {
    expect(parseCommand(["record", "flows/invoice.json"])).toEqual({
      command: "record",
      flow: "flows/invoice.json",
      out: resolve("invoice.osrec"),
      profileDir: DEFAULT_PROFILE_DIR,
      extensionDir: BUNDLED_EXTENSION_DIR,
      headed: false,
      open: false,
    });
  });

  it("names the file after the flow, without a .flow suffix", () => {
    expect(parseCommand(["record", "demos/invoice.flow.json"])).toMatchObject({
      out: resolve("invoice.osrec"),
    });
  });

  it("opens the recording in the review browser right after, if asked", () => {
    expect(parseCommand(["record", "f.json", "--open"])).toMatchObject({
      open: true,
    });
  });

  it("opens a recording in the review browser", () => {
    expect(parseCommand(["open", "demos/x.osrec"])).toEqual({
      command: "open",
      file: resolve("demos/x.osrec"),
      extensionDir: BUNDLED_EXTENSION_DIR,
    });
    expect(() => parseCommand(["open"])).toThrow(/recording/);
  });

  it("takes an output file, a profile, an extension build and a visible window", () => {
    expect(
      parseCommand([
        "record",
        "flow.json",
        "--out",
        "demos/x.osrec",
        "--profile",
        "~/p",
        "--extension",
        "ext",
        "--headed",
      ]),
    ).toMatchObject({
      out: resolve("demos/x.osrec"),
      profileDir: join(homedir(), "p"),
      extensionDir: resolve("ext"),
      headed: true,
    });
  });

  it("inspects a flow or a URL, with a screenshot path", () => {
    expect(
      parseCommand(["inspect", "https://example.com", "--screenshot", "a.png"]),
    ).toMatchObject({
      command: "inspect",
      flow: "https://example.com",
      screenshot: resolve("a.png"),
    });
  });

  it("takes no screenshot unless asked, and can narrow the tree to a part of the page", () => {
    const command = parseCommand(["inspect", "flow.json", "--within", "main"]);
    expect(command).toMatchObject({ within: "main" });
    expect(command).not.toHaveProperty("screenshot");
  });

  it("logs in at a URL", () => {
    expect(parseCommand(["login", "https://example.com"])).toMatchObject({
      command: "login",
      url: "https://example.com",
    });
  });

  it("installs the skill in the current project or a given one", () => {
    expect(parseCommand(["install-skill"])).toEqual({
      command: "install-skill",
      projectDir: process.cwd(),
    });
    expect(parseCommand(["install-skill", "--dir", "../app"])).toEqual({
      command: "install-skill",
      projectDir: resolve("../app"),
    });
  });

  it("shows help with no command or --help", () => {
    expect(parseCommand([])).toEqual({ command: "help" });
    expect(parseCommand(["--help"])).toEqual({ command: "help" });
    expect(parseCommand(["record", "--help"])).toEqual({ command: "help" });
  });

  it("rejects an unknown command, a missing argument and an unknown option", () => {
    expect(() => parseCommand(["film"])).toThrow(UsageError);
    expect(() => parseCommand(["record"])).toThrow(/flow file/);
    expect(() => parseCommand(["login"])).toThrow(/URL/);
    expect(() => parseCommand(["record", "f.json", "--nope"])).toThrow(
      UsageError,
    );
  });
});
