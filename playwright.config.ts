import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Local runs write artifacts outside OneDrive, which locks files mid-write.
  outputDir: process.env.CI ? "test-results" : join(tmpdir(), "clarteon-test-results"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // A production build with a fake Turnstile key and indexing off, like a preview deploy.
    command: `npm run build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
      NEXT_PUBLIC_ALLOW_INDEXING: "false",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "e2e-site-key",
      NEXT_PUBLIC_CF_ANALYTICS_TOKEN: "",
    },
  },
});
