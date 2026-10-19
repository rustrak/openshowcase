export interface BundleFile {
  name: string;
  size: number;
}

export interface BundlePart {
  kind: "video" | "photos" | "manifest" | "other";
  label: string;
  files: number;
  size: number;
}

const PARTS: { kind: BundlePart["kind"]; label: string; test: RegExp }[] = [
  { kind: "video", label: "Video", test: /\.(mp4|webm)$/i },
  { kind: "photos", label: "Photos", test: /\.(avif|webp|png|jpe?g)$/i },
  { kind: "manifest", label: "steps.json", test: /^steps\.json$/ },
];

/** What a bundle's bytes are spent on, biggest part first as the exporter lays them out. */
export function summarizeBundle(files: BundleFile[]): {
  total: number;
  parts: BundlePart[];
} {
  const parts: BundlePart[] = [
    ...PARTS.map(({ kind, label }) => ({ kind, label, files: 0, size: 0 })),
    { kind: "other", label: "Other", files: 0, size: 0 },
  ];
  for (const file of files) {
    const index = PARTS.findIndex(({ test }) => test.test(file.name));
    const part = parts[index === -1 ? PARTS.length : index];
    if (!part) continue;
    part.files += 1;
    part.size += file.size;
  }
  return {
    total: files.reduce((sum, file) => sum + file.size, 0),
    parts: parts.filter((part) => part.files > 0),
  };
}
