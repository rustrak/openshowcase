import { useCallback, useEffect, useState } from "react";
import { type InspectedBundle, inspectBundle } from "../core/inspect-bundle";
import { playgroundSource } from "../core/playground-url";

export type BundleFileState =
  | { status: "empty" }
  | { status: "loading"; name: string }
  | {
      status: "ready";
      name: string;
      /** What the player loads: a blob: URL of the file. */
      url: string;
      inspected: InspectedBundle;
    }
  | { status: "error"; name: string; error: string };

/**
 * The bundle on the playground: the file in the page's URL (a bundle the editor just
 * exported) or one the user opens. Owns the blob: URLs it creates.
 */
export function useBundleFile() {
  const [state, setState] = useState<BundleFileState>({ status: "empty" });

  const show = useCallback(
    async (name: string, load: () => Promise<Blob>, url?: string) => {
      setState({ status: "loading", name });
      try {
        const blob = await load();
        setState({
          status: "ready",
          name,
          url: url ?? URL.createObjectURL(blob),
          inspected: await inspectBundle(blob),
        });
      } catch (error) {
        setState({
          status: "error",
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [],
  );

  // A bundle handed over by the editor (its blob: URL lives as long as the editor's tab)
  useEffect(() => {
    const source = playgroundSource(window.location.search);
    if (!source) return;
    void show(
      source.name,
      async () => {
        const response = await fetch(source.url).catch(() => undefined);
        if (!response?.ok)
          throw new Error(
            "The exported file is gone (its editor tab was closed). Open it from your downloads.",
          );
        return response.blob();
      },
      source.url,
    );
  }, [show]);

  // Free the URLs this page created (not the editor's) when the file changes
  useEffect(() => {
    if (state.status !== "ready" || !state.url.startsWith("blob:")) return;
    const ownUrl = playgroundSource(window.location.search)?.url !== state.url;
    return () => {
      if (ownUrl) URL.revokeObjectURL(state.url);
    };
  }, [state]);

  const open = useCallback(
    (file: File) => void show(file.name, async () => file),
    [show],
  );

  return { state, open };
}
