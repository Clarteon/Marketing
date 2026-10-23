import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
