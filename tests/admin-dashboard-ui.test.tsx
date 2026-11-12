import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import type { AdminLeadRow, LeadStats } from "@/lib/admin/lead-queries";
import type { AdminBookingRow, BookingStats } from "@/lib/admin/queries";

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

const bookings: BookingStats = { pending: 2, confirmed: 5, cancelled: 1, upcoming: 3 };

const leads: LeadStats = {
  total: 9,
  new: 4,
  contacted: 2,
  booked: 2,
  closed: 1,
  lastSevenDays: 3,
  withError: 1,
};

const nextCall: AdminBookingRow = {
  requestId: "b-1",
  slotStart: new Date("2026-11-12T02:00:00.000Z"),
  slotEnd: new Date("2026-11-12T02:30:00.000Z"),
  name: "Grace Hopper",
  email: "grace@example.com",
  timezone: "Asia/Manila",
  status: "confirmed",
  createdAt: new Date("2026-11-10T02:00:00.000Z"),
};

const recentLead: AdminLeadRow = {
  id: "lead-1",
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  company: "Casa Verde",
  need: "The weekly report takes a whole day to put together.",
  source: "clara-chat",
  status: "new",
  createdAt: new Date("2026-11-10T02:30:00.000Z"),
  updatedAt: new Date("2026-11-10T02:30:00.000Z"),
};

describe("DashboardOverview", () => {
  it("shows call and lead counts with the queue total", async () => {
    const { container } = render(
      <DashboardOverview
        bookings={bookings}
        leads={leads}
        upcoming={[nextCall]}
        recentLeads={[recentLead]}
        openQuestions={3}
        unavailable={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Discovery calls" })).toBeInTheDocument();
    expect(screen.getByText("Holds to confirm")).toBeInTheDocument();
    expect(screen.getByText("Confirmed calls")).toBeInTheDocument();
    expect(screen.getByText("Total leads")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Email failures")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Questions in the review queue/ })).toHaveAttribute(
      "href",
      "/admin/review",
    );
    expect(screen.getByRole("link", { name: /Holds waiting to be confirmed/ })).toHaveAttribute(
      "href",
      "/admin/bookings?status=pending",
    );

    expect(screen.getByRole("link", { name: "Grace Hopper" })).toHaveAttribute(
      "href",
      "/admin/bookings/b-1",
    );
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Juan Dela Cruz" })).toHaveAttribute(
      "href",
      "/admin/leads/lead-1",
    );
    expect(screen.getByText("Clara")).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });

  it("shows the queue total and empty states when there is nothing to list", async () => {
    const { container } = render(
      <DashboardOverview
        bookings={bookings}
        leads={leads}
        upcoming={[]}
        recentLeads={[]}
        openQuestions={0}
        unavailable={false}
      />,
    );

    expect(screen.getByText("No calls on the calendar yet.")).toBeInTheDocument();
    expect(screen.getByText("No leads have arrived yet.")).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });

  it("warns once when a number could not be loaded", () => {
    render(
      <DashboardOverview
        bookings={undefined}
        leads={leads}
        upcoming={[]}
        recentLeads={[]}
        openQuestions={undefined}
        unavailable
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByText("Booking numbers are not available right now.")).toBeInTheDocument();
  });
});
