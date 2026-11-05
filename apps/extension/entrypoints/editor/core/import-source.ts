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

/** `?view=preview`: open on the demo as it will ship, to review it (the recorder's `open`). */
export function opensInPreview(search: string): boolean {
  return new URLSearchParams(search).get("view") === "preview";
}

/** The editor's URL query for a just-imported recording, keeping the view it was asked for. */
export function importedRecordingQuery(
  recordingId: string,
  search: string,
): string {
  const view = opensInPreview(search) ? "&view=preview" : "";
  return `?recordingId=${recordingId}${view}`;
}
