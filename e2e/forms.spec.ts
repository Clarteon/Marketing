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

  test("loads the brief from its existing anchor and keeps entered details after scrolling", async ({
    page,
  }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#brief-name")).toHaveCount(0);
    const formSpace = page.locator('[data-deferred-form="brief"]');
    // Layout height excludes the existing reveal animation's temporary scale.
    const placeholderHeight = await formSpace.evaluate(
      (node) => (node as HTMLElement).offsetHeight,
    );
    await page.getByRole("link", { name: "Send a project brief", exact: true }).click();
    await expect(page.locator("#brief-name")).toBeVisible();
    const loadedHeight = await formSpace.evaluate((node) => (node as HTMLElement).offsetHeight);
    expect(Math.abs(loadedHeight - placeholderHeight)).toBeLessThan(2);
    await page.locator("#brief-name").fill("Example visitor");
    await page.locator("h1").scrollIntoViewIfNeeded();
    await page.locator("#brief-title").scrollIntoViewIfNeeded();
    await expect(page.locator("#brief-name")).toHaveValue("Example visitor");
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

  test("does not fetch availability before the calendar is needed", async ({ page }) => {
    let availabilityRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/booking/availability")) availabilityRequests += 1;
    });
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    expect(availabilityRequests).toBe(0);
    await page.getByRole("link", { name: "Book a discovery call", exact: true }).click();
    await expect(page.locator("#book").getByRole("grid")).toBeVisible();
    expect(availabilityRequests).toBeGreaterThan(0);
  });

  test("offers a recovery path if the deferred booking code cannot load", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await page.route("**/_next/static/chunks/*.js", (route) => route.abort());
    await page.getByRole("link", { name: "Book a discovery call", exact: true }).click();
    await expect(page.locator("#book").getByRole("alert")).toContainText(
      "booking form couldn’t load",
    );
    await expect(
      page.locator("#book").getByRole("link", { name: "email the team" }),
    ).toHaveAttribute("href", "mailto:info@clarteon.tech");
  });

  async function chooseSlotAndFill(page: Page) {
    await page.goto("/contact#book");
    await page.getByRole("combobox", { name: "Times shown in" }).click();
    await page.getByRole("option", { name: "UTC" }).click();
    await page
      .locator("#book")
      .getByRole("button", { name: /, available$/ })
      .first()
      .click();
    await page
      .locator("#book")
      .getByRole("group", { name: /Available times on/ })
      .getByRole("button")
      .first()
      .click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#booking-name").fill("Ada Lovelace");
    await page.locator("#booking-email").fill("ada@example.com");
    await page.locator("#booking-consent").check();
  }

  test("shows the calendar first and reveals times after keyboard date selection", async ({
    page,
  }) => {
    await page.goto("/contact#book");
    const booking = page.locator("#book");
    await expect(booking.getByRole("grid")).toBeVisible();
    await expect(booking.getByRole("group", { name: /Available times on/ })).toHaveCount(0);
    await expect(booking.getByRole("button", { name: "Continue" })).toBeHidden();
    const date = booking.getByRole("button", { name: /, available$/ }).first();
    await date.focus();
    await date.press("Enter");
    await expect(booking.getByRole("grid")).toBeHidden();
    await expect(booking.getByRole("group", { name: /Available times on/ })).toBeVisible();
    await expect(booking.getByRole("button", { name: "Continue" })).toBeDisabled();
    await booking.getByRole("button", { name: "Change date" }).click();
    await expect(booking.getByRole("grid")).toBeVisible();
    await expect(date).toBeFocused();
  });

  test("keeps the card height consistent between four-week and six-week months", async ({
    page,
  }) => {
    const slots = ["2027-02-01T01:00:00.000Z", "2027-05-31T01:00:00.000Z"].map((start, index) => ({
      id: `month-${index}`,
      start,
      end: new Date(new Date(start).getTime() + 30 * 60_000).toISOString(),
    }));
    await page.unroute("/api/booking/availability**");
    await page.route("/api/booking/availability**", (route) =>
      route.fulfill({ json: { ok: true, slots } }),
    );
    await page.goto("/contact#book");
    const booking = page.locator("#book");
    await expect(booking.getByRole("grid", { name: /February 2027/ })).toBeVisible();
    const card = booking.locator('[class*="bookingFormPanel"]');
    const before = await card.boundingBox();
    await booking.getByRole("button", { name: "Next available month" }).click();
    await expect(booking.getByRole("grid", { name: /May 2027/ })).toBeVisible();
    const after = await card.boundingBox();
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  });

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

    const bookingFrame = page.locator('[data-deferred-form="booking"][data-loaded="true"]');
    await expect(bookingFrame).toBeVisible();
    const frameHeight = await bookingFrame.evaluate((node) => (node as HTMLElement).offsetHeight);
    expect(frameHeight).toBeLessThan(360);
  });

  test("animates brief consent checkbox state on user toggle", async ({ page }) => {
    await page.goto("/contact#brief");
    const checkbox = page.locator("#brief-consent");
    await expect(checkbox).toBeVisible();
    const control = checkbox.locator("..");
    await expect(control).toHaveAttribute("data-phase", "idle");

    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });
});
