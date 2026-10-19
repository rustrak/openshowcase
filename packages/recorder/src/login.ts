import { launch } from "./browser";

/** Opens a visible window on the profile at `url` and waits for the user to close it. */
export async function login(
  url: string,
  options: { profileDir: string; extensionDir: string },
): Promise<void> {
  const { context, close } = await launch({
    ...options,
    headless: false,
    keepChanges: true,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(url);
  await new Promise<void>((resolve) => {
    const closedAll = () => {
      if (context.pages().length === 0) resolve();
    };
    for (const p of context.pages()) p.on("close", closedAll);
    context.on("page", (p) => p.on("close", closedAll));
    context.on("close", () => resolve());
  });
  await close();
}
