import { useEffect, useRef, useState } from "react";

/** Files dropped anywhere on the page; `dragging` while a file is held over it. */
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  useEffect(() => {
    // dragenter/dragleave fire for every child crossed: count them to know when it left
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth += 1;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFileRef.current(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return dragging;
}
