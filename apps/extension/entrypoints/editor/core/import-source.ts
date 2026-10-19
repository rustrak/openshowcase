/**
 * A recording the recorder CLI's `open` command copied into this extension's `imports/`
 * folder, named in the editor's URL (`?import=imports/<name>.osrec`). Only plain file names
 * in that folder: the editor fetches it from its own extension origin.
 */
export function importPathFromQuery(search: string): string | undefined {
  const path = new URLSearchParams(search).get("import");
  return path && /^imports\/[\w.-]+\.osrec$/.test(path) && !path.includes("..")
    ? path
    : undefined;
}
