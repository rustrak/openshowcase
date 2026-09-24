import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import BrowserChrome from "../../components/BrowserChrome.svelte";

describe("BrowserChrome", () => {
  it("renders the demo title", async () => {
    const screen = await render(BrowserChrome, { title: "My demo" });
    await expect.element(screen.getByText("My demo")).toBeInTheDocument();
  });

  it("renders three window dots", async () => {
    const screen = await render(BrowserChrome, { title: "My demo" });
    expect(
      screen.container.querySelectorAll("span.h-2\\.5.w-2\\.5"),
    ).toHaveLength(3);
  });

  it("calls onReload when the reload button is clicked", async () => {
    const onReload = vi.fn();
    const screen = await render(BrowserChrome, { title: "My demo", onReload });

    await screen.getByTitle("Back to start").click();

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
