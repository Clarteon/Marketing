import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const axePath = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const result = await (
      window as unknown as { axe: { run: () => Promise<{ violations: { id: string }[] }> } }
    ).axe.run();
    return result.violations.map((violation) => violation.id);
  });
}

test("the admin requires sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign-in" })).toBeVisible();
  await expect(page.getByLabel("Admin password")).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test("admin sub-pages redirect to sign-in", async ({ page }) => {
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/review");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the team can sign in and open the bookings view", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Admin password").fill("e2e-admin-secret-that-is-long-enough-123456");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View all bookings" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/bookings$/);
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  await expect(page.getByText(/booking storage is not configured/i)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
