import { expect, test, type Page } from "@playwright/test";

async function navigateFromHeader(page: Page, label: string, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator("header").getByRole("link", { name: label, exact: true }).click();
}

test("scroll responses restart after navigating between pages without a refresh", async ({
  page,
  isMobile,
}) => {
  test.slow();
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/solutions");
  await page.evaluate(() => {
    document.documentElement.dataset.navigationCheck = "same-document";
  });
  await page.locator("#book").scrollIntoViewIfNeeded();

  for (const nextPage of ["Contact", "About", "Contact"]) {
    await navigateFromHeader(page, nextPage, isMobile);
    await expect(page).toHaveURL(new RegExp(`/${nextPage.toLowerCase()}$`));
    // The marker survives Next.js navigation, and disappears on a full document reload.
    await expect(page.locator("html")).toHaveAttribute("data-navigation-check", "same-document");
    const target =
      nextPage === "Contact"
        ? page.locator("#brief [data-revealed]").first()
        : page.locator("main .prose [data-revealed]").last();
    await expect(target).toHaveAttribute("data-motion-ready", "true");
    await expect(target).toHaveAttribute("data-revealed", "false");
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-revealed", "true");
    if (nextPage === "Contact") {
      const frame = page.locator("#message [data-locked]");
      await expect(frame).toHaveAttribute("data-locked", "false");
      await page.locator("#message").scrollIntoViewIfNeeded();
      await expect(frame).toHaveAttribute("data-locked", "true");
    }
  }

  const name = page.locator("#brief").getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Preview visitor");
  await page.getByRole("link", { name: "Book a discovery call", exact: true }).click();
  await expect(page).toHaveURL(/\/contact#book$/);
  await expect(name).toHaveValue("Preview visitor");
});

test("contact sections reveal on scroll and stay revealed when scrolling back", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/contact");
  const brief = page.locator("#brief");
  await brief.scrollIntoViewIfNeeded();
  await expect(brief.getByRole("heading", { level: 2 })).toHaveCSS("opacity", "1");
  await expect(brief.locator("[data-revealed]").first()).toHaveAttribute("data-revealed", "true");
  const message = page.locator("#message");
  await message.scrollIntoViewIfNeeded();
  await expect(message.locator("[data-locked]")).toHaveAttribute("data-locked", "true");
  await expect(message.locator("[data-revealed]")).toHaveAttribute("data-revealed", "true");
  await expect(message.getByRole("link", { name: /Email info/ })).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(brief.locator("[data-revealed]").first()).toHaveAttribute("data-revealed", "true");
});

test("new motion leaves every section readable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  for (const path of ["/contact", "/solutions", "/about", "/our-work", "/insights", "/privacy"]) {
    await page.goto(path);
    const hiddenContent = await page.locator("main [data-revealed]").evaluateAll((nodes) =>
      nodes.some((node) =>
        [node, ...node.children].some((element) => {
          const style = getComputedStyle(element);
          return style.opacity === "0" || style.filter.includes("blur");
        }),
      ),
    );
    expect(hiddenContent, path).toBe(false);
    await expect(page.locator('[data-reading-ready="true"]')).toHaveCount(0);
  }
});

test("page content stays visible when JavaScript is disabled", async ({ browser }) => {
  test.slow();
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  const page = await context.newPage();
  try {
    for (const path of ["/contact", "/solutions", "/about", "/our-work", "/insights"]) {
      await page.goto(`http://localhost:3100${path}`, { waitUntil: "domcontentloaded" });
      const hiddenContent = await page
        .locator("main [data-revealed]")
        .evaluateAll((nodes) =>
          nodes.some((node) =>
            [node, ...node.children].some((element) => getComputedStyle(element).opacity === "0"),
          ),
        );
      expect(hiddenContent, path).toBe(false);
    }
  } finally {
    await context.close();
  }
});
