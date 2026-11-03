import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaraChat } from "@/components/chat/ClaraChat";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/ui/TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Complete verification
    </button>
  ),
}));

function streamResponse(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    body,
    json: async () => ({}),
  } as Response;
}

async function openAndAccept() {
  fireEvent.click(screen.getByRole("button", { name: "Chat with Clara" }));
  fireEvent.click(screen.getByRole("button", { name: "I understand" }));
}

async function send(text: string) {
  fireEvent.change(screen.getByLabelText("Your message to Clara"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

describe("Clara chat widget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the privacy notice before the first message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);

    fireEvent.click(screen.getByRole("button", { name: "Chat with Clara" }));

    expect(screen.getByText("Before we start")).toBeInTheDocument();
    expect(screen.getByText(/sent to our AI provider/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy page" })).toHaveAttribute("href", "/privacy");
    expect(screen.queryByLabelText("Your message to Clara")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "I understand" }));

    expect(screen.getByText(/Hi, I’m Clara/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your message to Clara")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the first message with the session and bot token, and renders the reply as text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        streamResponse([{ type: "text", text: "<img src=x onerror=alert(1)>" }, { type: "done" }]),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);

    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    await send("Our reporting takes too long.");

    await waitFor(() => {
      expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    });
    expect(document.querySelector("img")).toBeNull();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat");
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({
      message: "Our reporting takes too long.",
      turnstileToken: "test-token",
    });
    expect(payload.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.history).toEqual([
      expect.objectContaining({
        role: "assistant",
        content: expect.stringContaining("Hi, I’m Clara"),
      }),
    ]);
  });

  it("formats streamed replies into paragraphs, emphasis, lists and safe links", async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller;
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body }));
    render(<ClaraChat turnstileSiteKey="site-key" />);
    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    await send("**Keep my message literal**");

    const emit = (text: string) =>
      stream.enqueue(new TextEncoder().encode(`${JSON.stringify({ type: "text", text })}\n`));
    await act(async () => {
      emit("Start with **report");
    });
    await waitFor(() => expect(screen.getByText(/Start with/)).toBeInTheDocument());
    await act(async () => {
      emit(
        "ing**.\n\n*Likely options:*\n\n- Automate collection\n- Review exceptions\n\n1. Map the workflow\n2. Test a small change\n\n[Book a discovery call](/contact#book)",
      );
      stream.close();
    });

    expect(await screen.findByText("reporting", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Likely options:", { selector: "em" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Map the workflow").closest("ol")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Book a discovery call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
    expect(screen.getByText("**Keep my message literal**")).toBeInTheDocument();
  });

  it("keeps unsafe links inert and never loads model images or executes HTML", async () => {
    const reply = [
      "[Unsafe](javascript:alert%281%29)",
      "[External](https://example.com/collect)",
      "[Disguised](https://meet.google.com@evil.example/)",
      "[Protocol relative](//evil.example/)",
      "[Meeting](https://meet.google.com/abc-defg-hij)",
      "[Calendar](https://calendar.google.com/calendar/event)",
      "[Email](mailto:info@clarteon.tech)",
      "![Tracking image](https://example.com/pixel.png)",
      "<img src=x onerror=alert(1)>",
    ].join("\n\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse([{ type: "text", text: reply }, { type: "done" }])),
    );
    render(<ClaraChat turnstileSiteKey="site-key" />);
    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    await send("Show the links.");
    const panel = within(screen.getByRole("dialog"));
    await panel.findByRole("link", { name: "Meeting" });
    for (const name of ["Unsafe", "External", "Disguised", "Protocol relative"]) {
      expect(panel.getByText(name).closest("a")).toBeNull();
    }
    expect(panel.getByRole("link", { name: "Meeting" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
    expect(panel.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "https://calendar.google.com/calendar/event",
    );
    expect(panel.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:info@clarteon.tech",
    );
    expect(document.querySelector("#clara-chat-panel img")).toBeNull();
    expect(panel.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("requires a deliberate confirmation click and sends only its server token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse([
          {
            type: "confirmation",
            token: "signed-server-proposal",
            description: "Save Ada’s details\nEmail: ada@example.com",
          },
          { type: "text", text: "Please review the details." },
          { type: "done" },
        ]),
      )
      .mockResolvedValueOnce(
        streamResponse([{ type: "text", text: "Your details were saved." }, { type: "done" }]),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);
    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    await send("Please save my details.");
    await screen.findByRole("group", { name: "Review action details" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/ }));
    await screen.findByText("Your details were saved.");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      message: "Confirm this action.",
      confirmationToken: "signed-server-proposal",
    });
    expect(screen.queryByRole("group", { name: "Review action details" })).not.toBeInTheDocument();
  });

  it("cancels a proposal without making a request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        {
          type: "confirmation",
          token: "signed-server-proposal",
          description: "Email a summary to ada@example.com",
        },
        { type: "text", text: "Please review the details." },
        { type: "done" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);
    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    await send("I’d like a summary.");
    await screen.findByRole("group", { name: "Review action details" });
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("group", { name: "Review action details" })).not.toBeInTheDocument();
  });

  it("shows the project brief and booking links when chat is degraded", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        {
          type: "degraded",
          message: "Chat is offline right now.",
          code: "temporarily_unavailable",
        },
        { type: "done" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);

    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    await send("Hello");

    await waitFor(() => {
      expect(screen.getByText("Chat is offline right now.")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Send a project brief" })).toHaveAttribute(
      "href",
      "/contact#brief",
    );
    expect(screen.getByRole("link", { name: "Book a call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
    expect(screen.getByRole("link", { name: "Email the team" })).toHaveAttribute(
      "href",
      "mailto:info@clarteon.tech",
    );
    expect(screen.getByLabelText("Your message to Clara")).toBeDisabled();
  });

  it("offers a way forward when the chat is not configured", async () => {
    render(<ClaraChat />);

    await openAndAccept();

    expect(screen.getByRole("status")).toHaveTextContent("Chat is offline right now.");
    expect(screen.getByRole("link", { name: "Send a project brief" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your message to Clara")).toBeDisabled();
  });
});
