import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_STATE } from "./support/admin";

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
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/review");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/bookings/00000000-0000-4000-8000-000000000001");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/leads/00000000-0000-4000-8000-000000000001");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the team can sign in and open the bookings view", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
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

  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/leads$/);
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.getByText(/lead storage is not configured/i)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test.describe("signed in", () => {
  test.use({ storageState: ADMIN_STATE });

  test("the booking detail page opens and explains missing storage", async ({ page }) => {
    await page.goto("/admin/bookings/00000000-0000-4000-8000-000000000001");
    await expect(page).toHaveURL(/\/admin\/bookings\/00000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Booking", exact: true })).toBeVisible();
    await expect(page.getByText(/booking storage is not configured/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to bookings/i })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("the lead detail page opens and explains missing storage", async ({ page }) => {
    await page.goto("/admin/leads/00000000-0000-4000-8000-000000000001");
    await expect(page).toHaveURL(/\/admin\/leads\/00000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Lead", exact: true })).toBeVisible();
    await expect(page.getByText(/lead storage is not configured/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to leads/i })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});
