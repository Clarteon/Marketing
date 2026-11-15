import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const axePath = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

async function sitemapPaths(page: Page): Promise<string[]> {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

test("every sitemap page renders with SEO basics, no console errors and no axe violations", async ({
  page,
}) => {
  // Axe scans every sitemap page. On a busy parallel runner that can approach the default timeout.
  test.setTimeout(240_000);
  // No real Turnstile calls; the forms spec covers the widget with a stub.
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  const paths = await sitemapPaths(page);
  expect(paths.length).toBeGreaterThanOrEqual(8);

  for (const path of paths) {
    const errors: string[] = [];
    page.on("console", (message) => {
      // HTTP status noise from unconfigured test APIs is expected; JS errors and CSP violations are not.
      if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
        errors.push(message.text());
      }
    });

    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    await expect(page, path).toHaveTitle(/Clarteon/);
    await expect(page.locator('link[rel="canonical"]'), path).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]'), path).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Privacy" }).last(), path).toBeVisible();

    // Wait for entrances, skipping scroll timelines and perpetual diagram effects.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.timeline === document.timeline &&
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished),
      ),
    );
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => {
      const result = await (
        window as unknown as { axe: { run: () => Promise<{ violations: { id: string }[] }> } }
      ).axe.run();
      return result.violations.map((violation) => violation.id);
    });
    expect(violations, path).toEqual([]);
    expect(errors, path).toEqual([]);
    page.removeAllListeners("console");
  }
});

test("pages have no horizontal overflow", async ({ page }) => {
  test.setTimeout(240_000);
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  for (const path of await sitemapPaths(page)) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("headlines fit a phone and the booking full stop stays with its word", async ({ page }) => {
  test.slow();
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/solutions", "/contact"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const lines = await page.locator("h1").evaluate((element) => {
      const style = getComputedStyle(element);
      return Math.round(element.getBoundingClientRect().height / parseFloat(style.lineHeight));
    });
    expect(lines, path).toBeLessThanOrEqual(2);
  }

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  // The last line of the booking headline used to be the "." alone once the drawn underline
  // stopped the phrase from wrapping. A bare full stop measures about 10px.
  const lastLineWidth = await page.locator("#book-title").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const lastLine = rects.filter((rect) => Math.abs(rect.bottom - bottom) < 6);
    const right = Math.max(...lastLine.map((rect) => rect.right));
    const left = Math.min(...lastLine.map((rect) => rect.left));
    return Math.round(right - left);
  });
  expect(lastLineWidth).toBeGreaterThan(40);
});

test("a preview build is hidden from search engines", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await page.request.get("/robots.txt")).text()).toMatch(/Disallow: \//);
});

test("the home page carries Organization and WebSite structured data", async ({ page }) => {
  await page.goto("/");
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  const types = JSON.parse(json ?? "{}")["@graph"].map(
    (node: { "@type": string }) => node["@type"],
  );
  expect(types).toEqual(["Organization", "WebSite"]);
});

test("published terms and unknown pages behave properly", async ({ page }) => {
  expect((await page.goto("/terms"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
  expect((await page.goto("/definitely-missing-page"))?.status()).toBe(404);
  await expect(page.getByText("HTTP 404", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "This page does not exist." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the home page" })).toBeVisible();
});

test("the skip link is the first stop for keyboard users", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard navigation is checked on desktop.");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("insights modal opens from cards, keeps one h1, and standalone article routes skip PageHero", async ({
  page,
}) => {
  await page.goto("/insights");
  await expect(page.locator("h1")).toHaveCount(1);

  const firstArticleTrigger = page.locator('[aria-label^="Read article: "]').first();
  await firstArticleTrigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("progressbar", { name: "Article reading progress" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Back to Insights/ })).toHaveCount(1);
  await expect(dialog.getByText(/min read/)).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(page.url()).toContain("?article=");

  await dialog.getByRole("button", { name: /Back to Insights/ }).click();
  await expect(dialog).toHaveCount(0);

  await firstArticleTrigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.goto("/insights/where-ai-agents-help-and-where-rules-win");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("progressbar", { name: "Article reading progress" })).toBeVisible();
  await expect(page.getByText(/min read/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to Insights/ })).toBeVisible();
});

test("case study modal opens on /our-work and standalone case study routes skip PageHero", async ({
  page,
}) => {
  await page.goto("/our-work");
  await expect(page.locator("h1")).toHaveCount(1);

  await page.getByRole("link", { name: "Read full case study" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("progressbar", { name: "Case study reading progress" }),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Back to Our work/ })).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(page.url()).toContain("?project=");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.goto("/our-work/janelles-satin-bouquet");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("progressbar", { name: "Article reading progress" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to Our work/ })).toBeVisible();
});

test("about page displays mission, vision, and clean organizational structure heading", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Mission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Organizational structure" })).toBeVisible();
  await expect(page.getByText("Team & structure")).toHaveCount(0);
});
