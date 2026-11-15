import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { BookingsTable } from "@/components/admin/BookingsTable";
import type { AdminBookingRow } from "@/lib/admin/queries";

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

const confirmedRow: AdminBookingRow = {
  requestId: "request-1",
  slotStart: new Date("2026-11-20T06:00:00.000Z"),
  slotEnd: new Date("2026-11-20T07:00:00.000Z"),
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  timezone: "Asia/Manila",
  status: "confirmed",
  meetLink: "https://meet.google.com/abc-defg-hij",
  createdAt: new Date("2026-11-10T02:30:00.000Z"),
  confirmedAt: new Date("2026-11-10T02:31:00.000Z"),
  notes: "Wants to automate the weekly report.",
};

const pendingRow: AdminBookingRow = {
  requestId: "request-2",
  slotStart: new Date("2026-11-25T08:00:00.000Z"),
  slotEnd: new Date("2026-11-25T08:30:00.000Z"),
  name: "Ana Santos",
  email: "ana@example.com",
  timezone: "Asia/Singapore",
  status: "pending",
  createdAt: new Date("2026-11-09T05:00:00.000Z"),
};

const cancelledRow: AdminBookingRow = {
  requestId: "request-3",
  slotStart: new Date("2026-11-26T08:00:00.000Z"),
  slotEnd: new Date("2026-11-26T08:30:00.000Z"),
  name: "Mia Reyes",
  email: "mia@example.com",
  timezone: "Asia/Manila",
  status: "cancelled",
  meetLink: "https://meet.google.com/xyz-abcd-efg",
  createdAt: new Date("2026-11-08T05:00:00.000Z"),
  confirmedAt: new Date("2026-11-08T05:01:00.000Z"),
  cancelledAt: new Date("2026-11-10T05:00:00.000Z"),
};

describe("admin bookings table", () => {
  it("shows guest details, status and the meeting link", async () => {
    const { container } = render(<BookingsTable rows={[confirmedRow, pendingRow]} />);

    expect(screen.getByRole("table", { name: "Discovery-call bookings" })).toBeInTheDocument();
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "juan@example.com" })).toHaveAttribute(
      "href",
      "mailto:juan@example.com",
    );
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Edit booking for Juan Dela Cruz" })).toHaveAttribute(
      "href",
      "/admin/bookings/request-1",
    );
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Wants to automate the weekly report.")).toBeInTheDocument();
    expect(screen.getByText("No meeting link yet")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("marks a missing meeting link and missing notes plainly", () => {
    render(<BookingsTable rows={[pendingRow]} />);

    expect(screen.queryByRole("link", { name: "Join Meet" })).not.toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("shows a cancelled booking as cancelled and hides its dead invite", async () => {
    const { container } = render(<BookingsTable rows={[cancelledRow]} />);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Join Meet" })).not.toBeInTheDocument();
    expect(screen.getByText("Invite removed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View booking for Mia Reyes" })).toHaveAttribute(
      "href",
      "/admin/bookings/request-3",
    );
    await expectNoA11yViolations(container);
  });
});
