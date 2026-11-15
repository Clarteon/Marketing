import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaraChat } from "@/components/chat/ClaraChat";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/ui/TurnstileWidget", () => ({
  preloadTurnstile: vi.fn(),
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Complete verification
    </button>
  ),
}));

function replyResponse(): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify({ type: "text", text: "Okay." })}\n`));
      controller.enqueue(encoder.encode(`${JSON.stringify({ type: "done" })}\n`));
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

describe("scenario 23: long chat", { timeout: 30_000 }, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("wraps up politely at the per-conversation cap and offers a way forward", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => replyResponse());
    vi.stubGlobal("fetch", fetchMock);
    render(<ClaraChat turnstileSiteKey="site-key" />);

    await openAndAccept();
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));

    for (let index = 1; index <= 10; index += 1) {
      await send(`Message ${index}`);
      await waitFor(() => {
        expect(screen.getAllByText("Okay.")).toHaveLength(index);
      });
    }

    expect(fetchMock).toHaveBeenCalledTimes(10);

    await send("One message too many");

    await waitFor(() => {
      expect(screen.getByText(/This chat has reached its limit/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(10);
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
  });
});
