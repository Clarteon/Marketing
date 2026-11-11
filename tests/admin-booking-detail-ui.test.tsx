import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingEditForm } from "@/app/admin/(dashboard)/bookings/[requestId]/booking-edit-form";
import { CancelBooking } from "@/app/admin/(dashboard)/bookings/[requestId]/cancel-booking";
import { RescheduleCalendar } from "@/app/admin/(dashboard)/bookings/[requestId]/reschedule-calendar";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { formatSlotDate, formatSlotDateTime, formatSlotTime } from "@/lib/booking/format";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigation.refresh,
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

const REQUEST_ID = "00000000-0000-4000-8000-000000000001";
const TIMEZONE = "Asia/Manila";

const SLOTS = [
  { id: "slot-a", start: "2026-11-11T02:00:00.000Z", end: "2026-11-11T02:30:00.000Z" },
  { id: "slot-b", start: "2026-11-11T02:30:00.000Z", end: "2026-11-11T03:00:00.000Z" },
];

const booking = {
  requestId: REQUEST_ID,
  name: "Ada Lovelace",
  email: "ada@example.com",
  timezone: TIMEZONE,
  notes: "Reporting takes too long.",
};

interface FetchInit {
  method?: string;
  body?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function stubFetch(patchResponse: () => Promise<unknown> = async () => jsonResponse({ ok: true })) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: FetchInit = {}) => {
    const url = String(input);
    if (url.includes("/api/booking/availability")) {
      expect(init.method ?? "GET").toBe("GET");
      return jsonResponse({ ok: true, timezone: TIMEZONE, slots: SLOTS });
    }
    if (url.includes(`/api/admin/bookings/${REQUEST_ID}`)) {
      return patchResponse();
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderInMain(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <main>{ui}</main>
    </ToastProvider>,
  );
}

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

beforeEach(() => {
  navigation.refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingEditForm", () => {
  it("shows the guest details and saves only what changed", async () => {
    const fetchMock = stubFetch();
    renderInMain(<BookingEditForm booking={booking} />);

    expect(screen.getByLabelText("Guest name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Guest email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Notes from the guest")).toHaveValue("Reporting takes too long.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/admin/bookings/${REQUEST_ID}`);
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Grace Hopper" });

    expect(await screen.findByText(/Saved\. The table now shows/)).toBeInTheDocument();
    expect(
      await screen.findByRole("status", { name: "Success: Booking details saved." }),
    ).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
    await expectNoA11yViolations(document.body);
  });

  it("shows a clear message when the session expired", async () => {
    stubFetch(async () => jsonResponse({ ok: false, error: "not_signed_in" }, 401));
    renderInMain(<BookingEditForm booking={booking} />);

    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows a message when the server cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    renderInMain(<BookingEditForm booking={booking} />);

    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server. Try again.",
    );
  });
});

describe("RescheduleCalendar", () => {
  it("loads open times and reschedules the chosen slot", async () => {
    const fetchMock = stubFetch();
    renderInMain(
      <RescheduleCalendar
        requestId={REQUEST_ID}
        timezone={TIMEZONE}
        currentSlotStart="2026-11-10T06:00:00.000Z"
      />,
    );

    const dateLabel = formatSlotDate(SLOTS[0].start, TIMEZONE);
    const dateButton = await screen.findByRole("button", {
      name: `${dateLabel}, available`,
    });
    fireEvent.click(dateButton);

    const timeLabel = formatSlotTime(SLOTS[1].start, TIMEZONE);
    const slotButton = screen.getByRole("button", { name: `${dateLabel} at ${timeLabel}` });
    fireEvent.click(slotButton);
    expect(slotButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1];
    expect(String(init?.method)).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ slotId: "slot-b" });

    const expected = `Booking moved to ${formatSlotDateTime(SLOTS[1].start, TIMEZONE)}.`;
    expect(await screen.findByRole("status", { name: `Success: ${expected}` })).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
    await expectNoA11yViolations(document.body);
  });

  it("explains when the slot was taken and reloads the times", async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse({ ok: false, error: "slot_unavailable" }, 409),
    );
    renderInMain(
      <RescheduleCalendar
        requestId={REQUEST_ID}
        timezone={TIMEZONE}
        currentSlotStart="2026-11-10T06:00:00.000Z"
      />,
    );

    const dateLabel = formatSlotDate(SLOTS[0].start, TIMEZONE);
    fireEvent.click(await screen.findByRole("button", { name: `${dateLabel}, available` }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `${dateLabel} at ${formatSlotTime(SLOTS[0].start, TIMEZONE)}`,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That time was just taken. The open times have been refreshed.",
    );
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows a friendly message when availability cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: false, error: "rate_limited" }, 429)),
    );
    renderInMain(
      <RescheduleCalendar
        requestId={REQUEST_ID}
        timezone={TIMEZONE}
        currentSlotStart="2026-11-10T06:00:00.000Z"
      />,
    );

    expect(await screen.findByText(/Open times could not be loaded right now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("CancelBooking", () => {
  it("asks before cancelling, then cancels the booking", async () => {
    const fetchMock = stubFetch();
    renderInMain(<CancelBooking requestId={REQUEST_ID} guestName="Ada Lovelace" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(screen.getByText(/The invitation disappears from their calendar/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel booking" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/admin/bookings/${REQUEST_ID}`);
    expect(String(init?.method)).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ cancel: true });

    const expected = "Booking cancelled. The guest was emailed and the time is open again.";
    expect(await screen.findByRole("status", { name: `Success: ${expected}` })).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
    await expectNoA11yViolations(document.body);
  });

  it("leaves the booking alone when the admin keeps it", async () => {
    const fetchMock = stubFetch();
    renderInMain(<CancelBooking requestId={REQUEST_ID} guestName="Ada Lovelace" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep booking" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes, cancel booking" })).not.toBeInTheDocument();
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("explains an already cancelled booking", async () => {
    stubFetch(async () => jsonResponse({ ok: false, error: "booking_not_cancellable" }, 409));
    renderInMain(<CancelBooking requestId={REQUEST_ID} guestName="Ada Lovelace" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This booking is already cancelled.",
    );
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("says the cancellation did not finish when the server fails", async () => {
    stubFetch(async () => jsonResponse({ ok: false, error: "booking_edit_failed" }, 503));
    renderInMain(<CancelBooking requestId={REQUEST_ID} guestName="Ada Lovelace" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The cancellation did not finish. Check the status before trying again.",
    );
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
