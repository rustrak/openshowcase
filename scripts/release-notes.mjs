// Prints the GitHub release body for the current version to stdout.
// Usage: node scripts/release-notes.mjs
//
// Every package is in one `fixed` changesets group, so they share a version.
// The body collects each package's CHANGELOG section for that version, skipping
// entries that only say "Updated dependencies", then adds install instructions.

import { existsSync, readFileSync } from "node:fs";

const PACKAGES = [
  "apps/extension",
  "packages/schema",
  "packages/player-core",
  "packages/exporter",
  "adapters/player-react",
  "adapters/player-vue",
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const { version } = readJson("apps/extension/package.json");

// The lines under `## <version>` up to the next `## ` heading.
function changelogSection(dir) {
  const path = `${dir}/CHANGELOG.md`;
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n");
  const start = lines.indexOf(`## ${version}`);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

// Keeps `### ...` headings and changeset bullets. Drops "Updated dependencies"
// bullets (with their indented package list), plain text such as "No changes in
// this release.", and any heading left with no entries under it.
function meaningfulEntries(section) {
  const kept = [];
  let skippingDeps = false;
  for (const line of section) {
    if (line.startsWith("- Updated dependencies")) {
      skippingDeps = true;
      continue;
    }
    const isContinuation = /^\s+\S/.test(line);
    if (skippingDeps && isContinuation) continue;
    skippingDeps = false;
    if (
      line.startsWith("### ") ||
      line.startsWith("- ") ||
      isContinuation ||
      line === ""
    ) {
      kept.push(line);
    }
  }
  const text = kept.join("\n").trim();
  return text
    .split(/(?=^### )/m)
    .filter((block) => block.replace(/^### .*$/m, "").trim() !== "")
    .join("\n")
    .trim();
}

const out = [];

for (const dir of PACKAGES) {
  const entries = meaningfulEntries(changelogSection(dir));
  if (!entries) continue;
  const { name } = readJson(`${dir}/package.json`);
  out.push(`## ${name}`, "", entries.replace(/^### /gm, "#### "), "");
}

const zip = `openshowcase-extension-${version}-chrome.zip`;
const npmPackages = PACKAGES.map((dir) => readJson(`${dir}/package.json`))
  .filter((pkg) => !pkg.private)
  .map((pkg) => `- \`${pkg.name}@${version}\``);

out.push(
  "## Install the Chrome extension",
  "",
  `1. Download \`${zip}\` from the assets below and unzip it.`,
  "2. Open `chrome://extensions` and turn on **Developer mode**.",
  "3. Click **Load unpacked** and select the unzipped folder.",
  "",
  "## npm packages",
  "",
  ...npmPackages,
  "",
);

process.stdout.write(out.join("\n"));
