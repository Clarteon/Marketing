import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { ADMIN_PASSWORD, BASE_URL, PORT } from "./e2e/support/admin";

export default defineConfig({
  testDir: "./e2e",
  // Local runs write artifacts outside OneDrive, which locks files mid-write.
  outputDir: process.env.CI ? "test-results" : join(tmpdir(), "clarteon-test-results"),
  // The admin sign-in allows five attempts per fifteen minutes per server
  // process, so the session is created once for the whole run and the specs
  // that only need a session reuse it through storageState.
  globalSetup: "./e2e/support/admin-state.ts",
  fullyParallel: true,
  workers: process.env.CI ? undefined : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // A production build with a fake Turnstile key and indexing off, like a preview deploy.
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      NEXT_PUBLIC_ALLOW_INDEXING: "false",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "e2e-site-key",
      NEXT_PUBLIC_CF_ANALYTICS_TOKEN: "",
      ADMIN_AUTH_SECRET: ADMIN_PASSWORD,
      DATABASE_URL: "",
    },
  },
});
