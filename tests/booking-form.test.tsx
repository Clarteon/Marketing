import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingForm } from "@/components/ui/BookingForm";

vi.mock("@/components/ui/TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Complete verification
    </button>
  ),
}));

const slot = {
  id: "slot-1",
  start: "2026-10-27T01:00:00.000Z",
  end: "2026-10-27T01:30:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("booking form", { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("books a selected slot after verification", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/booking/availability")) {
        expect(init?.method ?? "GET").toBe("GET");
        return jsonResponse({ ok: true, timezone: "Asia/Manila", slots: [slot] });
      }
      expect(init?.method).toBe("POST");
      return jsonResponse({
        ok: true,
        booking: {
          start: slot.start,
          end: slot.end,
          timezone: "Asia/Manila",
          meetLink: "https://meet.google.com/abc-defg-hij",
          calendarLink: null,
        },
        confirmationEmailSent: true,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BookingForm turnstileSiteKey="site-key" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByRole("group", { name: /Available times on/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tuesday, October 27, available/ }));
    fireEvent.click(screen.getByRole("button", { name: / at / }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/What would you like to talk about/), {
      target: { value: "Manual reporting takes too long every week." },
    });
    fireEvent.click(screen.getByLabelText(/I agree/));
    fireEvent.click(screen.getByRole("button", { name: "Complete verification" }));

    const submit = screen.getByRole("button", { name: "Book discovery call" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    const bookingCall = fetchMock.mock.calls.find(([url]) => url === "/api/booking");
    expect(bookingCall).toBeTruthy();
    const payload = JSON.parse(String(bookingCall?.[1]?.body));
    expect(payload).toMatchObject({
      slotId: "slot-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      consent: true,
      turnstileToken: "test-token",
    });
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText("Your discovery call is confirmed.")).toBeInTheDocument();
  });

  it("keeps the slots when the current timezone is chosen again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, timezone: "Asia/Manila", slots: [slot] })),
    );

    render(<BookingForm turnstileSiteKey="site-key" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Times shown in" }));
    fireEvent.click(screen.getByRole("option", { name: "UTC" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole("grid", { name: /Available dates/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tuesday, October 27, available/ }));
    expect(screen.getByRole("button", { name: / at / })).toBeInTheDocument();
  });

  it("reveals times only after choosing a date and clears a time when the date changes", async () => {
    const secondSlot = {
      ...slot,
      id: "slot-2",
      start: "2026-10-28T01:00:00.000Z",
      end: "2026-10-28T01:30:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, slots: [slot, secondSlot] })),
    );
    render(<BookingForm turnstileSiteKey="site-key" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByRole("button", { name: / at / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tuesday, October 27, available/ }));
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: / at / }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Change date" }));
    fireEvent.click(screen.getByRole("button", { name: /Wednesday, October 28, available/ }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: / at / })).toHaveAttribute("aria-pressed", "false");
  });

  it("browses available months without choosing a date", async () => {
    const novemberSlot = {
      ...slot,
      id: "november-slot",
      start: "2026-11-02T01:00:00.000Z",
      end: "2026-11-02T01:30:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, slots: [slot, novemberSlot] })),
    );
    render(<BookingForm turnstileSiteKey="site-key" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Next available month" }));
    expect(screen.getByRole("grid", { name: /November 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: / at / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Monday, November 2, available/ }));
    expect(screen.getByRole("group", { name: /Monday, November 2/ })).toBeInTheDocument();
  });

  it("keeps six calendar weeks for short and long months", async () => {
    const monthSlots = ["2027-02-01T01:00:00.000Z", "2027-05-31T01:00:00.000Z"].map(
      (start, index) => ({
        id: `month-${index}`,
        start,
        end: new Date(new Date(start).getTime() + 30 * 60_000).toISOString(),
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, slots: monthSlots })),
    );
    render(<BookingForm turnstileSiteKey="site-key" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
    fireEvent.click(screen.getByRole("button", { name: "Next available month" }));
    expect(screen.getByRole("grid", { name: /May 2027/ })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
  });

  it("offers the project brief when availability is unavailable", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: false, error: "booking_unavailable" }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<BookingForm turnstileSiteKey="site-key" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/Booking is not available right now/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send a project brief" })).toBeInTheDocument();
  });
});
