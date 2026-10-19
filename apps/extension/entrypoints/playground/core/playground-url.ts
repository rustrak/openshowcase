export interface PlaygroundSource {
  url: string;
  name: string;
}

/** Query string that opens the playground on a file (e.g. a just-exported bundle's blob: URL). */
export function playgroundQuery({ url, name }: PlaygroundSource): string {
  return `?${new URLSearchParams({ src: url, name })}`;
}

export function playgroundSource(query: string): PlaygroundSource | undefined {
  const params = new URLSearchParams(query);
  const url = params.get("src");
  if (!url) return undefined;
  return {
    url,
    name: params.get("name") ?? url.slice(url.lastIndexOf("/") + 1),
  };
}
