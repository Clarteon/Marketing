import { expect, test, type Page } from "@playwright/test";

// A stand-in for Cloudflare Turnstile that passes immediately. Providers are never called:
// every /api request below is answered in the browser.
async function stubTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.turnstile = {
        render: (el, options) => { setTimeout(() => options.callback("e2e-token"), 50); return "w1"; },
        remove: () => {},
      };`,
    }),
  );
}

function slotsFromTomorrow() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(2, 0, 0, 0);
  return [0, 1].map((offset) => {
    const slotStart = new Date(start.getTime() + offset * 60 * 60_000);
    return {
      id: `slot-${offset}`,
      start: slotStart.toISOString(),
      end: new Date(slotStart.getTime() + 30 * 60_000).toISOString(),
    };
  });
}

async function fillBrief(page: Page) {
  await page.getByLabel("Name").first().fill("Ada Lovelace");
  await page.getByLabel("Email").first().fill("ada@example.com");
  await page.getByLabel("What is slowing you down?").fill("Manual reporting takes all of Friday.");
  await page.getByLabel(/I agree that Clarteon may use these details to reply/).check();
}

test.describe("project brief form", () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
    await page.route("/api/booking/availability**", (route) =>
      route.fulfill({ json: { ok: true, timezone: "UTC", slots: [] } }),
    );
  });

  test("sends only the expected fields and confirms the brief", async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route("/api/lead", async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/contact#brief");
    await fillBrief(page);
    await page.locator("#brief").getByRole("button", { name: /send/i }).click();

    await expect(page.getByText(/Your project brief is saved/)).toBeVisible();
    expect(sent).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      consent: true,
      turnstileToken: "e2e-token",
      website: "",
    });
    const allowed = [
      "company",
      "consent",
      "email",
      "name",
      "need",
      "requestId",
      "startedAt",
      "teamSize",
      "turnstileToken",
      "website",
    ];
    expect(Object.keys(sent ?? {}).filter((key) => !allowed.includes(key))).toEqual([]);
  });

  test("shows a clear message when the service is down", async ({ page }) => {
    await page.route("/api/lead", (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "service_unavailable" } }),
    );

    await page.goto("/contact#brief");
    await fillBrief(page);
    await page.locator("#brief").getByRole("button", { name: /send/i }).click();

    await expect(page.locator("#brief").getByRole("alert")).toContainText(
      "not available right now",
    );
  });
});

test.describe("discovery call booking", () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
    await page.route("/api/booking/availability**", (route) =>
      route.fulfill({ json: { ok: true, timezone: "UTC", slots: slotsFromTomorrow() } }),
    );
  });

  async function chooseSlotAndFill(page: Page) {
    await page.goto("/contact#book");
    await page.getByLabel("Times shown in").selectOption("UTC");
    await page.locator("#book").getByRole("button", { pressed: false }).first().click();
    await page.locator("#booking-name").fill("Ada Lovelace");
    await page.locator("#booking-email").fill("ada@example.com");
    await page.locator("#booking-consent").check();
  }

  test("books a slot and shows the Meet link", async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route("/api/booking", async (route) => {
      sent = route.request().postDataJSON();
      const [slot] = slotsFromTomorrow();
      await route.fulfill({
        json: {
          ok: true,
          booking: {
            start: slot.start,
            end: slot.end,
            timezone: "UTC",
            meetLink: "https://meet.google.com/abc-defg-hij",
            calendarLink: null,
          },
          confirmationEmailSent: true,
        },
      });
    });

    await chooseSlotAndFill(page);
    await page.getByRole("button", { name: "Book discovery call" }).click();

    await expect(page.getByText("Your discovery call is confirmed.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Join with Google Meet" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
    expect(sent).toMatchObject({ slotId: "slot-0", timezone: "UTC", turnstileToken: "e2e-token" });
  });

  test("asks for another time when the slot was just taken", async ({ page }) => {
    await page.route("/api/booking", (route) =>
      route.fulfill({ status: 409, json: { ok: false, error: "slot_unavailable" } }),
    );

    await chooseSlotAndFill(page);
    await page.getByRole("button", { name: "Book discovery call" }).click();

    await expect(page.locator("#book").getByRole("alert")).toContainText(
      "That time was just taken",
    );
  });

  test("offers the project brief when booking fails", async ({ page }) => {
    await page.route("/api/booking", (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "booking_failed" } }),
    );

    await chooseSlotAndFill(page);
    await page.getByRole("button", { name: "Book discovery call" }).click();

    await expect(page.locator("#book").getByRole("alert")).toContainText("send a project brief");
  });

  test("falls back to the project brief when the calendar is unavailable", async ({ page }) => {
    await page.unroute("/api/booking/availability**");
    await page.route("/api/booking/availability**", (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "booking_unavailable" } }),
    );

    await page.goto("/contact#book");
    await expect(page.getByText("Booking is not available right now.")).toBeVisible();
    await expect(
      page.locator("#book").getByRole("link", { name: "Send a project brief" }),
    ).toBeVisible();
  });
});
