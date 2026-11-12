import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { LeadsTable } from "@/components/admin/LeadsTable";
import type { AdminLeadRow } from "@/lib/admin/lead-queries";

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

const formLead: AdminLeadRow = {
  id: "lead-1",
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  company: "Casa Verde",
  need: "The weekly report takes a whole day to put together.",
  teamSize: "11-50",
  source: "website-form",
  status: "new",
  createdAt: new Date("2026-11-10T02:30:00.000Z"),
  updatedAt: new Date("2026-11-10T02:30:00.000Z"),
  teamEmailSentAt: new Date("2026-11-10T02:30:05.000Z"),
  receiptEmailSentAt: new Date("2026-11-10T02:30:06.000Z"),
};

const chatLead: AdminLeadRow = {
  id: "lead-2",
  name: "Ana Santos",
  email: "ana@example.com",
  need: "We lose track of customer questions across three inboxes.",
  source: "clara-chat",
  status: "contacted",
  createdAt: new Date("2026-11-09T05:00:00.000Z"),
  updatedAt: new Date("2026-11-09T05:00:00.000Z"),
  teamEmailSentAt: new Date("2026-11-09T05:00:02.000Z"),
};

const failedLead: AdminLeadRow = {
  id: "lead-3",
  name: "Mia Reyes",
  email: "mia@example.com",
  company: "Reyes Trading",
  need: "Orders arrive by email and get typed in twice.",
  teamSize: "2-10",
  source: "website-form",
  status: "closed",
  createdAt: new Date("2026-11-08T05:00:00.000Z"),
  updatedAt: new Date("2026-11-10T05:00:00.000Z"),
  lastError: "team_timeout",
};

describe("LeadsTable", () => {
  it("shows the lead, its need and a working mail link", async () => {
    const { container } = render(<LeadsTable rows={[formLead]} />);

    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "juan@example.com" })).toHaveAttribute(
      "href",
      "mailto:juan@example.com",
    );
    expect(screen.getByText("Casa Verde · 11–50 people")).toBeInTheDocument();
    expect(
      screen.getByText("The weekly report takes a whole day to put together."),
    ).toBeInTheDocument();
    expect(screen.getByText("Form")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Juan Dela Cruz" })).toHaveAttribute(
      "href",
      "/admin/leads/lead-1",
    );
    expect(screen.getByRole("link", { name: "Edit lead from Juan Dela Cruz" })).toHaveAttribute(
      "href",
      "/admin/leads/lead-1",
    );

    await expectNoA11yViolations(container);
  });

  it("names Clara as the source and marks a partly sent lead", async () => {
    const { container } = render(<LeadsTable rows={[chatLead]} />);

    expect(screen.getByText("Clara")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Team alert only")).toBeInTheDocument();
    expect(screen.getByText("No company or team size")).toBeInTheDocument();
    expect(screen.getByText("Contacted")).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });

  it("surfaces the recorded email failure", () => {
    render(<LeadsTable rows={[failedLead]} />);

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("team_timeout")).toBeInTheDocument();
    expect(screen.queryByText("Sent")).not.toBeInTheDocument();
  });

  it("renders every row without repeating keys", () => {
    render(<LeadsTable rows={[formLead, chatLead, failedLead]} />);

    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});
