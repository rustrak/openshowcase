// The published package must not depend on anything but the schema: third-party code
// (alien-signals) is compiled into dist/. Fails when dist/'s JS imports any other package, or
// when the public types (what dist/index.d.ts reaches) reference one.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ALLOWED = new Set(["@rustrak/openshowcase-schema"]);
const DIST = new URL("../dist/", import.meta.url).pathname;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

function* files(dir, ext = ".js") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, ext);
    else if (entry.name.endsWith(ext) && !entry.name.endsWith(".d.ts"))
      yield path;
  }
}

const offenders = [];
for (const file of files(DIST)) {
  for (const [, specifier] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
    if (!ALLOWED.has(specifier))
      offenders.push(`${relative(DIST, file)}: "${specifier}"`);
  }
}

// the public types: follow relative imports from index.d.ts
const seen = new Set();
const queue = [join(DIST, "index.d.ts")];
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file) || !existsSync(file)) continue;
  seen.add(file);
  for (const [, specifier] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
    if (specifier.startsWith(".")) {
      queue.push(resolve(dirname(file), specifier.replace(/\.js$/, ".d.ts")));
    } else if (!ALLOWED.has(specifier)) {
      offenders.push(`${relative(DIST, file)} (public types): "${specifier}"`);
    }
  }
}

if (offenders.length) {
  console.error(
    `dist/ imports packages it must bundle instead:\n  ${offenders.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `dist/ imports no package but the schema (JS, and the ${seen.size} public type files)`,
);
