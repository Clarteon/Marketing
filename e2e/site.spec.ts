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
  for (const path of await sitemapPaths(page)) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
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

test("draft pages are not published", async ({ page }) => {
  expect((await page.goto("/terms"))?.status()).toBe(404);
});

test("the skip link is the first stop for keyboard users", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard navigation is checked on desktop.");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
