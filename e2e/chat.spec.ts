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
  await expect(page.locator("#clara-chat-panel").getByText(/Hi, I’m Clara/)).toBeVisible();
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

  test("books from tappable times and keeps the details when a time is taken", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    const timezone = "Asia/Manila";
    const first = {
      id: "slot-1",
      label: "Monday, November 9 at 10:00 AM GMT+8",
      start: "2026-11-09T02:00:00.000Z",
      end: "2026-11-09T02:30:00.000Z",
    };
    const second = {
      id: "slot-2",
      label: "Monday, November 9 at 11:00 AM GMT+8",
      start: "2026-11-09T03:00:00.000Z",
      end: "2026-11-09T03:30:00.000Z",
    };
    await page.route("/api/chat", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(body);
      const booking = body.booking as { step: string; slot_id?: string } | undefined;
      const options = (slots: (typeof first)[], offer: string) => ({
        type: "booking_options",
        bookingOptions: { timezone, slots, offer },
      });
      const events =
        booking?.step === "times"
          ? [
              options([first, second], "offer-1"),
              { type: "text", text: "Pick a time for your discovery call." },
            ]
          : booking?.step === "review"
            ? [
                {
                  type: "confirmation",
                  action: "book_call",
                  token: `signed-${booking.slot_id}`,
                  description:
                    "Book a discovery call\nName: Test Visitor\nEmail: visitor@example.com",
                },
                { type: "text", text: "Review your details, then confirm the booking." },
              ]
            : body.confirmationToken === "signed-slot-1"
              ? [
                  options([second], "offer-2"),
                  {
                    type: "text",
                    text: "That time is no longer available. Pick another time below.",
                  },
                ]
              : [
                  {
                    type: "text",
                    text: "Your discovery call is confirmed. [Join with Google Meet](https://meet.google.com/abc-defg-hij)",
                  },
                ];
      return route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([...events, { type: "done" }]),
      });
    });
    await page.goto("/");
    await openChat(page);
    const panel = page.locator("#clara-chat-panel");
    await panel.getByRole("button", { name: "Book a call", exact: true }).click();
    const card = panel.getByRole("group", { name: "Book a discovery call" });
    await card.getByRole("button", { name: first.label }).click();
    await expect(card.getByLabel("Name", { exact: true })).toBeFocused();
    await card.getByLabel("Name", { exact: true }).fill("Test Visitor");
    await card.getByLabel("Email for the calendar invite").fill("visitor@example.com");
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    expect(requests).toHaveLength(1);
    await card.getByRole("button", { name: "Review booking" }).click();
    await expect(panel.getByRole("group", { name: "Review action details" })).toContainText(
      "visitor@example.com",
    );
    expect(requests[1]).toMatchObject({
      booking: { step: "review", slot_id: first.id, offer: "offer-1" },
    });
    expect(requests[1]).not.toHaveProperty("confirmationToken");
    await panel.getByRole("button", { name: "Confirm booking" }).click();
    await expect(
      panel.getByText("That time is no longer available. Pick another time below."),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: first.label })).toHaveCount(0);
    await card.getByRole("button", { name: second.label }).click();
    await expect(card.getByLabel("Email for the calendar invite")).toHaveValue(
      "visitor@example.com",
    );
    await card.getByRole("button", { name: "Review booking" }).click();
    await panel.getByRole("button", { name: "Confirm booking" }).click();
    await expect(panel.getByRole("link", { name: "Join with Google Meet" })).toBeVisible();
    expect(requests).toHaveLength(5);
    expect(requests[4]).toMatchObject({
      message: "Confirm this action.",
      confirmationToken: "signed-slot-2",
    });
    expect(JSON.stringify(requests[4].history)).not.toContain("visitor@example.com");
  });

  test("exposes no delete method on the public booking routes", async ({ request }) => {
    for (const path of ["/api/chat", "/api/booking", "/api/booking/availability"]) {
      expect((await request.delete(path)).status()).toBe(405);
    }
  });

  test("preloads verification on open and retries a failed download without losing the draft", async ({
    page,
  }) => {
    let attempts = 0;
    let failFirstDownload = () => {};
    const firstDownload = new Promise<void>((resolve) => {
      failFirstDownload = resolve;
    });
    const isTurnstileScript = (url: URL) =>
      url.hostname === "challenges.cloudflare.com" && url.pathname === "/turnstile/v0/api.js";
    await page.route(isTurnstileScript, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await firstDownload;
        await route.abort();
        return;
      }
      await route.fulfill({
        contentType: "text/javascript",
        body: `window.turnstile = {
          render: (el, options) => {
            if (options.appearance === "interaction-only") options.callback("e2e-token");
            return "w1";
          },
          remove: () => {},
        };`,
      });
    });

    await page.goto("/");
    expect(attempts).toBe(0);
    const preload = page.waitForRequest((request) => isTurnstileScript(new URL(request.url())));
    await page.getByRole("button", { name: "Chat with Clara" }).click();
    await preload;
    const panel = page.locator("#clara-chat-panel");
    const input = panel.getByLabel("Your message to Clara");
    const send = panel.getByRole("button", { name: "Send message" });
    try {
      await expect(panel.getByRole("heading", { name: "Before we start" })).toBeVisible();
      await expect(panel.getByText("Verifying your browser…")).toHaveCount(0);
      await panel.getByRole("button", { name: "I understand" }).click();
      await expect(panel.getByRole("status")).toHaveText("Verifying your browser…");
      await input.fill("Can you help with weekly reporting?");
      await expect(send).toBeDisabled();
    } finally {
      failFirstDownload();
    }

    await expect(panel.getByRole("status")).toHaveText("Verification couldn’t load.");
    await panel.getByRole("button", { name: "Retry verification" }).click();
    await expect(send).toBeEnabled();
    await expect(input).toHaveValue("Can you help with weekly reporting?");
    expect(attempts).toBe(2);
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

  test("dictates a first message into the existing draft and keeps booking confirmation explicit", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: async () => {
          const context = new AudioContext();
          const output = context.createMediaStreamDestination();
          const tone = context.createOscillator();
          tone.connect(output);
          tone.start();
          await context.resume();
          const track = output.stream.getAudioTracks()[0];
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            document.body.dataset.micReleased = "true";
            void context.close();
          };
          document.body.dataset.micReleased = "false";
          return output.stream;
        },
      });
    });
    const voiceRequests: Array<Record<string, string>> = [];
    const messages: Array<Record<string, unknown>> = [];
    let resolveTranscription = () => {};
    const transcriptionReady = new Promise<void>((resolve) => {
      resolveTranscription = resolve;
    });
    await page.route("/api/chat/transcribe", async (route) => {
      voiceRequests.push(route.request().headers());
      const body = route.request().postDataBuffer();
      expect(body?.subarray(0, 4).toString()).toBe("RIFF");
      expect(body?.length).toBeLessThanOrEqual(640_044);
      await transcriptionReady;
      await route.fulfill({
        headers: { "X-Chat-Session-Verified": "1" },
        json: { text: "Book a call." },
      });
    });
    await page.route("/api/chat", async (route) => {
      messages.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          { type: "text", text: "Please review the details below." },
          { type: "confirmation", token: "booking-proposal", description: "Book a discovery call" },
          { type: "done" },
        ]),
      });
    });

    const response = await page.goto("/");
    expect(response?.headers()["permissions-policy"]).toContain("microphone=(self)");
    const admin = await page.request.get("/admin/login");
    expect(admin.headers()["permissions-policy"]).toContain("microphone=()");
    await openChat(page);
    const panel = page.locator("#clara-chat-panel");
    const input = panel.getByLabel("Your message to Clara");
    const mic = panel.getByRole("button", { name: "Record a message" });
    const send = panel.getByRole("button", { name: "Send message" });
    const composer = panel.locator("form");
    const stop = composer.getByRole("button", { name: "Stop recording" });
    const discard = composer.getByRole("button", { name: "Discard recording" });
    await expect(panel.getByLabel("Dictation language")).toHaveCount(0);
    await expect(input).toBeFocused();
    await expect(send).toBeDisabled();
    await expect(mic).toBeEnabled();
    await composer.screenshot({ path: test.info().outputPath("composer-empty.png") });
    await input.fill("Hi Clara.");
    await mic.click();
    await expect(composer.getByRole("status")).toHaveText("Recording");
    await expect(stop).toBeFocused();
    await expect(send).toHaveCount(0);
    await composer.screenshot({ path: test.info().outputPath("composer-recording.png") });
    await discard.click();
    await expect(page.locator("body")).toHaveAttribute("data-mic-released", "true");
    await expect(input).toHaveValue("Hi Clara.");
    await expect(mic).toBeFocused();
    expect(voiceRequests).toHaveLength(0);

    await mic.press("Enter");
    await expect(composer.getByText("0:01", { exact: true })).toBeVisible();
    await stop.press("Enter");
    try {
      await expect(composer.getByRole("status")).toHaveText("Turning speech into text…");
      await expect(composer.getByRole("button", { name: "Cancel dictation" })).toBeFocused();
      await composer.screenshot({ path: test.info().outputPath("composer-transcribing.png") });
    } finally {
      resolveTranscription();
    }
    await expect(input).toHaveValue("Hi Clara. Book a call.");
    await expect(input).toBeFocused();
    await expect(page.locator("body")).toHaveAttribute("data-mic-released", "true");
    expect(voiceRequests).toHaveLength(1);
    expect(voiceRequests[0]["x-turnstile-token"]).toBe("e2e-token");
    expect(voiceRequests[0]).not.toHaveProperty("x-dictation-language");
    expect(messages).toHaveLength(0);
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );

    await input.press("Tab");
    await expect(mic).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(send).toBeFocused();
    await composer.screenshot({ path: test.info().outputPath("composer-ready.png") });
    await send.press("Enter");
    await expect(panel.getByRole("group", { name: "Review action details" })).toBeVisible();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      message: "Hi Clara. Book a call.",
      sessionId: voiceRequests[0]["x-chat-session"],
    });
    expect(messages[0]).not.toHaveProperty("turnstileToken");
    expect(messages[0]).not.toHaveProperty("confirmationToken");
  });

  test("reads a completed reply with a feminine local voice and stops when chat closes", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: class {
          constructor(public text: string) {}
        },
      });
      Object.defineProperty(window, "speechSynthesis", {
        value: Object.assign(new EventTarget(), {
          getVoices: () => [
            {
              name: "Microsoft David - English (United States)",
              localService: true,
              lang: "en-US",
            },
            { name: "Microsoft Aria (Natural)", localService: false, lang: "en-US" },
            { name: "Microsoft Zira - English (United States)", localService: true, lang: "en-US" },
          ],
          speak: (utterance: { text: string; voice: { name: string }; rate: number }) => {
            document.body.dataset.spoken = utterance.text;
            document.body.dataset.speechVoice = utterance.voice.name;
            document.body.dataset.speechRate = String(utterance.rate);
          },
          cancel: () => {
            document.body.dataset.speechStopped = "true";
          },
        }),
      });
    });
    await page.route("/api/chat", (route) =>
      route.fulfill({
        contentType: "application/x-ndjson",
        body: ndjson([
          { type: "text", text: "[Book a discovery call](/contact#book)." },
          { type: "done" },
        ]),
      }),
    );
    await page.goto("/");
    await openChat(page);
    const panel = page.locator("#clara-chat-panel");
    await panel.getByLabel("Your message to Clara").fill("How do I start?");
    await panel.getByRole("button", { name: "Send message" }).click();
    await expect(panel.getByRole("link", { name: "Book a discovery call" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveAttribute("data-spoken", /.+/);
    await expect(panel.getByLabel("Read-aloud language")).toHaveCount(0);
    await panel.getByRole("button", { name: "Read aloud" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-spoken", "Book a discovery call.");
    await expect(page.locator("body")).toHaveAttribute(
      "data-speech-voice",
      "Microsoft Zira - English (United States)",
    );
    await expect(page.locator("body")).toHaveAttribute("data-speech-rate", "0.95");
    await expect(panel.getByRole("button", { name: "Stop reading" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).toHaveAttribute("data-speech-stopped", "true");
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
