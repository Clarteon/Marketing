import { chromium, type FullConfig } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_STATE } from "./admin";

async function signInOnce(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3100";
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto("/admin/login");
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin$/);

    await context.storageState({ path: ADMIN_STATE });
    await context.close();
  } finally {
    await browser.close();
  }
}

export default signInOnce;
