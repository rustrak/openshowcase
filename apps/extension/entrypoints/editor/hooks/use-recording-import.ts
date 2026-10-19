import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { importRecording } from "@/lib/db";
import { unpackRecording } from "@/lib/recording-file";

/**
 * Imports an `.osrec` file into the database, then reopens the editor on it. `packaged` is a
 * recording shipped inside the extension (see core/import-source.ts), imported on mount.
 */
export function useRecordingImport(packaged?: string) {
  const [importing, setImporting] = useState(packaged != null);

  const importBlob = useCallback(async (load: () => Promise<Blob>) => {
    setImporting(true);
    try {
      const recordingId = await importRecording(
        await unpackRecording(await load()),
      );
      window.location.replace(`?recordingId=${recordingId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setImporting(false);
    }
  }, []);

  useEffect(() => {
    if (!packaged) return;
    void importBlob(async () => {
      const response = await fetch(`/${packaged}`);
      if (!response.ok) throw new Error(`Couldn't read ${packaged}`);
      return response.blob();
    });
  }, [packaged, importBlob]);

  const importFile = useCallback(
    (file: File) => importBlob(async () => file),
    [importBlob],
  );

  return { importing, importFile };
}
