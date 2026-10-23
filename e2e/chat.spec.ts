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
