import { expect, test, type Page } from "@playwright/test";

// Cloudflare Turnstile is never called in this suite. The stub passes at once,
// and every /api/chat response is answered in the browser.
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

function ndjson(events: Array<Record<string, unknown>>): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join("");
}

async function openChat(page: Page) {
  await page.getByRole("button", { name: "Chat with Clara" }).click();
  await expect(page.getByRole("heading", { name: "Before we start" })).toBeVisible();
  await expect(page.getByLabel("Your message to Clara")).toHaveCount(0);
  await page.getByRole("button", { name: "I understand" }).click();
  await expect(page.getByText(/Hi, I’m Clara/)).toBeVisible();
}

test.describe("Clara chat", () => {
  test("confirms device time and searches for a different city", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route("/api/chat", (route) => {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          {
            type: "text",
            text:
              requests.length === 1
                ? "Shall we use your device’s local time? [Choose your local time](#clara-timezone)"
                : "Here are the available call times.",
          },
          { type: "done" },
        ]),
      });
    });
    await page.goto("/");
    await openChat(page);
    const panel = page.locator("#clara-chat-panel");
    await panel.getByLabel("Your message to Clara").fill("I’d like to book a discovery call.");
    await panel.getByRole("button", { name: "Send message" }).click();
    await expect(panel.getByRole("button", { name: "Yes, use this time" })).toBeVisible();
    await panel.getByRole("button", { name: "Choose another location" }).click();
    await panel.getByLabel("Search city or time zone").fill("Manila");
    await expect(panel.getByRole("button", { name: /^Manila —/ })).toBeVisible();
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await panel.screenshot({ path: test.info().outputPath("clara-timezone.png") });
    await panel.getByRole("button", { name: /^Manila —/ }).click();
    await expect(panel.getByText("Here are the available call times.")).toBeVisible();
    expect(requests[1]).toMatchObject({
      timezone: "Asia/Manila",
      message: expect.stringContaining("Asia/Manila"),
    });
    await expect(panel.getByRole("group", { name: "Choose your local time" })).toHaveCount(0);
  });

  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("passes the privacy gate, sends the bot token once and renders the reply as text", async ({
    page,
  }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route("/api/chat", async (route) => {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          { type: "text", text: "Hello " },
          { type: "text", text: "there." },
          { type: "done" },
        ]),
      });
    });

    await page.goto("/");
    await openChat(page);

    const input = page.getByLabel("Your message to Clara");
    await input.fill("Our weekly reporting takes too long.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.locator("#clara-chat-panel").getByText("Hello there.")).toBeVisible();
    expect(requests[0]).toMatchObject({
      message: "Our weekly reporting takes too long.",
      turnstileToken: "e2e-token",
    });
    expect(requests[0].sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(requests[0].history).toEqual([
      expect.objectContaining({
        role: "assistant",
        content: expect.stringContaining("Hi, I’m Clara"),
      }),
    ]);
    await expect(
      page.locator("#clara-chat-panel").getByRole("button", { name: "Complete verification" }),
    ).toHaveCount(0);

    await input.fill("What could you automate first?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("#clara-chat-panel").getByText("Hello there.")).toHaveCount(2);
    expect(requests[1]).not.toHaveProperty("turnstileToken");
  });

  test("makes formatted replies readable without overflowing the panel", async ({ page }) => {
    await page.route("/api/chat", (route) =>
      route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          { type: "text", text: "Start with **report" },
          {
            type: "text",
            text: "ing automation**.\n\n*The team can confirm the fit.*\n\n- Collect updates automatically\n- Flag missing information\n- Review exceptions together\n\n1. Map the workflow\n2. Test a small change\n\n[Book a discovery call](/contact#book)\n\nWhich step takes the most time?",
          },
          { type: "done" },
        ]),
      }),
    );
    await page.goto("/");
    await openChat(page);
    await page.getByLabel("Your message to Clara").fill("Our reports are hard to manage.");
    await page.getByRole("button", { name: "Send message" }).click();
    const panel = page.locator("#clara-chat-panel");
    await expect(panel.locator("strong")).toHaveText("reporting automation");
    await expect(panel.locator("em")).toHaveText("The team can confirm the fit.");
    await expect(panel.locator("ul > li")).toHaveCount(3);
    await expect(panel.locator("ol > li")).toHaveCount(2);
    await expect(panel.getByRole("link", { name: "Book a discovery call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await panel.screenshot({ path: test.info().outputPath("clara-formatting.png") });
  });

  test("reviews an action before confirming and allows cancellation", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route("/api/chat", (route) => {
      const request = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(request);
      return route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson(
          request.confirmationToken
            ? [{ type: "text", text: "Your details were saved." }, { type: "done" }]
            : [
                {
                  type: "confirmation",
                  token: "e2e-signed-proposal",
                  description:
                    "Save these details and send the lead notifications\nName: Ada\nEmail: ada@example.com",
                },
                { type: "text", text: "Please review the details below." },
                { type: "done" },
              ],
        ),
      });
    });
    await page.goto("/");
    await openChat(page);
    const panel = page.locator("#clara-chat-panel");
    await panel.getByLabel("Your message to Clara").fill("Please save my details.");
    await panel.getByRole("button", { name: "Send message" }).click();
    await expect(panel.getByRole("group", { name: "Review action details" })).toContainText(
      "ada@example.com",
    );
    expect(requests).toHaveLength(1);
    await panel.screenshot({ path: test.info().outputPath("action-confirmation.png") });
    await panel.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(panel.getByRole("group", { name: "Review action details" })).toHaveCount(0);
    expect(requests).toHaveLength(1);
    await panel.getByLabel("Your message to Clara").fill("Prepare the details again.");
    await panel.getByRole("button", { name: "Send message" }).click();
    await panel.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(panel.getByText("Your details were saved.")).toBeVisible();
    expect(requests[2]).toMatchObject({
      message: "Confirm this action.",
      confirmationToken: "e2e-signed-proposal",
    });
  });

  test("never renders model text as HTML", async ({ page }) => {
    await page.route("/api/chat", (route) =>
      route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([{ type: "text", text: "<img src=x onerror=alert(1)>" }, { type: "done" }]),
      }),
    );

    await page.goto("/");
    await openChat(page);
    await page.getByLabel("Your message to Clara").fill("Try this.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(
      page.locator("#clara-chat-panel").getByText("<img src=x onerror=alert(1)>"),
    ).toBeVisible();
    await expect(page.locator("#clara-chat-panel img")).toHaveCount(0);
  });

  test("offers the fallback paths when chat is degraded", async ({ page }) => {
    await page.route("/api/chat", (route) =>
      route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          {
            type: "degraded",
            message: "Chat is offline right now.",
            code: "temporarily_unavailable",
          },
          { type: "done" },
        ]),
      }),
    );

    await page.goto("/");
    await openChat(page);
    await page.getByLabel("Your message to Clara").fill("Hello");
    await page.getByRole("button", { name: "Send message" }).click();

    const panel = page.locator("#clara-chat-panel");
    await expect(panel.getByRole("status")).toContainText("Chat is offline right now.");
    await expect(panel.getByRole("link", { name: "Send a project brief" })).toHaveAttribute(
      "href",
      "/contact#brief",
    );
    await expect(panel.getByRole("link", { name: "Book a call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
    await expect(panel.getByRole("link", { name: "Email the team" })).toHaveAttribute(
      "href",
      "mailto:info@clarteon.tech",
    );
    await expect(panel.getByLabel("Your message to Clara")).toBeDisabled();
  });

  test("can be closed with Escape and returns focus to the chat button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Clara" }).click();
    await expect(page.getByRole("heading", { name: "Before we start" })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("heading", { name: "Before we start" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Chat with Clara" })).toBeFocused();
  });
});
