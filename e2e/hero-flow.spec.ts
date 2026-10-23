import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/");
});

test("diagram selection persists, previews related paths, and resets", async ({
  page,
  isMobile,
}) => {
  const diagram = page.getByRole("region", { name: /interactive flow/i });
  const manual = diagram.getByRole("button", { name: "Copying & pasting data" });
  const assistant = diagram.getByRole("button", { name: "AI assistants" });
  const status = diagram.getByRole("status");
  await diagram.scrollIntoViewIfNeeded();
  const initialHeight = (await diagram.boundingBox())!.height;

  if (isMobile) await manual.tap();
  else await manual.click();
  await expect(manual).toHaveAttribute("aria-pressed", "true");
  await expect(status).toContainText("Workflow automation and connected systems");
  for (const id of ["manual", "automation", "integration"]) {
    await expect(diagram.locator('path[data-node="' + id + '"]')).toHaveAttribute(
      "data-emphasis",
      "active",
    );
  }
  await expect(diagram.locator('path[data-node="custom"]')).toHaveAttribute(
    "data-emphasis",
    "muted",
  );

  if (!isMobile) {
    await assistant.hover();
    await expect(status).toContainText("AI assistants");
    await diagram.getByText("Business challenges", { exact: true }).hover();
    await expect(status).toContainText("Copying & pasting data");
  }

  expect((await diagram.boundingBox())!.height).toBe(initialHeight);
  await diagram.getByRole("button", { name: "Reset" }).click();
  await expect(manual).toHaveAttribute("aria-pressed", "false");
  await expect(status).toContainText("Select an icon to learn more.");
});

test("keyboard focus previews, Enter and Space select, and Escape clears", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Keyboard interaction is covered on desktop.");
  const diagram = page.getByRole("region", { name: /interactive flow/i });
  const manual = diagram.getByRole("button", { name: "Copying & pasting data" });
  const apps = diagram.getByRole("button", { name: "Apps that don’t talk" });
  await manual.focus();
  await expect(diagram.getByRole("status")).toContainText("Copying & pasting data");
  await expect(manual).toHaveCSS("outline-style", "solid");
  await manual.press("Enter");
  await expect(manual).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(apps).toBeFocused();
  await expect(diagram.getByRole("status")).toContainText("Apps that don’t talk");
  await page.keyboard.press("Space");
  await expect(apps).toHaveAttribute("aria-pressed", "true");
  await expect(manual).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(apps).toHaveAttribute("aria-pressed", "false");
  await expect(diagram.getByRole("status")).toContainText("Select an icon to learn more.");
});

test("diagram fits phone, tablet and desktop with readable targets and stable descriptions", async ({
  page,
}) => {
  test.slow(); // Six viewports, with every node and chat clearance checked at each width.
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
    const diagram = page.getByRole("region", { name: /interactive flow/i });
    await diagram.scrollIntoViewIfNeeded();
    const box = (await diagram.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const nodes = diagram.getByRole("button").filter({ has: page.locator("svg") });
    await expect(nodes).toHaveCount(8);
    for (const node of await nodes.all()) {
      const target = (await node.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      await node.click();
      expect((await diagram.boundingBox())!.height).toBe(box.height);
      const status = diagram.getByRole("status");
      expect(await status.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(
        true,
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("hero-" + width + ".png"),
      fullPage: false,
    });
  }
});

test("reduced motion keeps all interactions functional without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const diagram = page.getByRole("region", { name: /interactive flow/i });
  await diagram.getByRole("button", { name: "Workflow automation" }).click();
  await expect(diagram.getByRole("status")).toContainText("Move routine tasks");
  const animated = await diagram.locator("*").evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const style = getComputedStyle(element);
        return (
          style.animationName !== "none" ||
          style.transitionDuration.split(",").some((duration) => parseFloat(duration) > 0)
        );
      }).length,
  );
  expect(animated).toBe(0);
});
