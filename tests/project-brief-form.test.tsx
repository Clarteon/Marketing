import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectBriefForm } from "@/components/ui/ProjectBriefForm";

vi.mock("@/components/ui/TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Complete verification
    </button>
  ),
}));

describe("project brief form", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the brief after verification and shows the saved message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectBriefForm turnstileSiteKey="site-key" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/What is slowing you down/), {
      target: { value: "Manual reporting takes too long every week." },
    });
    fireEvent.click(screen.getByLabelText(/I agree/));
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));

    const submit = screen.getByRole("button", { name: "Send project brief" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lead");
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      consent: true,
      turnstileToken: "test-token",
    });
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByRole("status")).toHaveTextContent("Your project brief is saved.");
  });

  it("shows a clear message when the server rejects the fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectBriefForm turnstileSiteKey="site-key" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/What is slowing you down/), {
      target: { value: "Manual reporting takes too long every week." },
    });
    fireEvent.click(screen.getByLabelText(/I agree/));
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));
    fireEvent.click(screen.getByRole("button", { name: "Send project brief" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Please check the fields");
    expect(screen.getByRole("button", { name: "Send project brief" })).toBeDisabled();
  });
});
