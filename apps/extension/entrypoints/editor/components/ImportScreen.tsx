import { FileUp, LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { RECORDING_FILE_EXTENSION } from "@/lib/recording-file";
import { useFileDrop } from "../../playground/hooks/use-file-drop";
import { importPathFromQuery } from "../core/import-source";
import { useRecordingImport } from "../hooks/use-recording-import";
import { MessageScreen } from "./Screens";

/** The editor with no recording: record one, or import a file made by the recorder CLI. */
export function ImportScreen() {
  const { importing, importFile } = useRecordingImport(
    importPathFromQuery(window.location.search),
  );
  const dragging = useFileDrop(importFile);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative h-full">
      <MessageScreen
        title="No recording selected"
        text={
          <>
            Record a tab from the OpenShowcase toolbar button, or import a{" "}
            <code className="font-mono">{RECORDING_FILE_EXTENSION}</code>{" "}
            recording made by the recorder CLI.
          </>
        }
        action={
          <>
            <Button
              className="gap-1.5"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
            >
              {importing ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <FileUp className="size-3.5" />
              )}
              Import a recording
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={RECORDING_FILE_EXTENSION}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFile(file);
                e.target.value = "";
              }}
            />
          </>
        }
      />
      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-window/70 text-ui font-medium animate-in fade-in-0 duration-150">
          Drop to import this recording
        </div>
      )}
    </div>
  );
}
