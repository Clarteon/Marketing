import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlotUnavailableError } from "@/lib/booking/errors";
import { resetConfigForTests } from "@/lib/config";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { executeChatTool, type ChatToolContext, type ChatToolDependencies } from "@/lib/chat/tools";

const NOW = new Date("2026-10-23T08:00:00.000Z");

function context(overrides: Partial<ChatToolContext> = {}): ChatToolContext {
  return {
    sessionId: crypto.randomUUID(),
    ip: "203.0.113.7",
    pageUrl: "/solutions",
    latestMessage: "Our reporting takes too long.",
    priceIntent: false,
    now: NOW,
    timezone: "Asia/Manila",
    ...overrides,
  };
}

function leadStore() {
  const save = vi.fn(async (lead: Record<string, unknown>) => ({
    lead: { ...lead, id: "lead-1", createdAt: NOW },
    created: true,
  }));
  const updateFromChat = vi.fn(async (id: string, input: Record<string, unknown>) => ({
    id,
    ...input,
    createdAt: NOW,
  }));
  return { save, updateFromChat };
}

function emailConfig() {
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.EMAIL_FROM = "Clarteon <info@clarteon.test>";
  process.env.EMAIL_REPLY_TO = "info@clarteon.test";
  process.env.TEAM_ALERT_EMAIL = "team@clarteon.test";
  resetConfigForTests();
}

describe("Clara tools", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
    delete process.env.RESEND_API_KEY;
    resetConfigForTests();
  });

  it("rejects an unknown tool and invalid arguments without side effects", async () => {
    await expect(executeChatTool("run_code", {}, context())).resolves.toMatchObject({
      ok: false,
      error: "unknown_tool",
    });

    await expect(executeChatTool("save_lead", { name: "Ada" }, context())).resolves.toMatchObject({
      ok: false,
      error: "invalid_arguments",
    });
  });

  it("never searches the knowledge index for a price question", async () => {
    const searchKnowledge = vi.fn();

    const result = await executeChatTool(
      "search_knowledge",
      { query: "pricing for a chatbot" },
      context({ priceIntent: true, deps: { searchKnowledge } }),
    );

    expect(result).toMatchObject({ ok: false, error: "pricing_boundary" });
    expect(searchKnowledge).not.toHaveBeenCalled();
  });

  it("returns retrieved content as clearly untrusted data", async () => {
    const searchKnowledge = vi
      .fn()
      .mockResolvedValue([
        { title: "Automation", content: "We automate repetitive work.", url: "/solutions" },
      ]);

    const result = await executeChatTool(
      "search_knowledge",
      { query: "automation" },
      context({ deps: { searchKnowledge } }),
    );

    expect(result).toMatchObject({ ok: true, untrusted: true });
    expect(searchKnowledge).toHaveBeenCalledWith("automation", {
      logUnanswered: true,
      sourceUrl: "/solutions",
    });
  });

  it("refuses to save or email passwords and payment data", async () => {
    const store = leadStore();
    const sendSolutionEmail = vi.fn();
    const sendHandoffEmail = vi.fn();
    const deps = {
      getLeadStore: vi.fn(() => store),
      sendEmail: sendSolutionEmail,
      sendLeadEmails: vi.fn(),
    } as unknown as ChatToolDependencies;

    await expect(
      executeChatTool(
        "save_lead",
        {
          name: "Ada",
          email: "ada@example.com",
          problem_summary: "My card number is 4111 1111 1111 1111.",
        },
        context({ deps }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "sensitive_data" });

    await expect(
      executeChatTool(
        "save_lead",
        {
          name: "Ada",
          email: "ada@example.com",
          problem_summary: "The card is 4111 1111 1111 1111.",
        },
        context({ deps }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "sensitive_data" });

    await expect(
      executeChatTool(
        "send_solution_brief",
        {
          email: "ada@example.com",
          summary: "The plan includes a password: hunter2 for the portal.",
        },
        context({ deps }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "sensitive_data" });

    expect(store.save).not.toHaveBeenCalled();
    expect(sendSolutionEmail).not.toHaveBeenCalled();
    expect(sendHandoffEmail).not.toHaveBeenCalled();
  });

  it("saves a Clara lead and updates the same lead on a repeat call", async () => {
    const store = leadStore();
    const sendLeadEmails = vi.fn().mockResolvedValue({ team: true, receipt: true });
    const deps = {
      getLeadStore: vi.fn(() => store),
      sendLeadEmails,
    } as unknown as ChatToolDependencies;

    const result = await executeChatTool(
      "save_lead",
      {
        name: "Ada Lovelace",
        email: "ADA@example.com",
        company: "Analytical Engines",
        problem_summary: "Manual reporting takes too long.",
      },
      context({ deps }),
    );

    expect(result).toMatchObject({ ok: true, created: true, team_notified: true });
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
        source: "clara-chat",
      }),
    );
    expect(sendLeadEmails).toHaveBeenCalledOnce();

    store.save.mockResolvedValueOnce({
      lead: { id: "lead-1", name: "Ada Lovelace", email: "ada@example.com" },
      created: false,
    } as never);

    const repeat = await executeChatTool(
      "save_lead",
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        problem_summary: "We also need a CRM.",
      },
      context({ deps }),
    );

    expect(repeat).toMatchObject({ ok: true, created: false, updated: true });
    expect(store.updateFromChat).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ need: expect.stringContaining("CRM") }),
    );

    store.save.mockResolvedValueOnce({
      lead: { id: "lead-1", name: "Ada Lovelace", email: "ada@example.com" },
      created: false,
    } as never);
    store.updateFromChat.mockRejectedValueOnce(new Error("database unavailable"));

    const failed = await executeChatTool(
      "save_lead",
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        problem_summary: "A later detail that must not be claimed as saved.",
      },
      context({ deps }),
    );

    expect(failed).toMatchObject({ ok: false, error: "lead_update_failed" });
    expect(sendLeadEmails).toHaveBeenCalledTimes(2);
  });

  it("returns availability in the visitor's timezone", async () => {
    const getAvailability = vi.fn().mockResolvedValue({
      slots: [
        {
          id: "slot-1",
          start: "2026-10-26T01:00:00.000Z",
          end: "2026-10-26T01:30:00.000Z",
        },
      ],
    });

    const toolContext = context({ timezone: undefined, deps: { getAvailability } });
    const result = await executeChatTool(
      "check_availability",
      { timezone: "Asia/Manila", from: "2026-10-26" },
      toolContext,
    );

    expect(result).toMatchObject({ ok: true, timezone: "Asia/Manila" });
    expect(result.slots).toHaveLength(1);
    expect(toolContext.timezone).toBe("Asia/Manila");
    expect(getAvailability).toHaveBeenCalledWith({ timezone: "Asia/Manila", now: NOW });
  });

  it("refuses to book without a timezone and never uses an untrusted Meet link", async () => {
    const bookDiscoveryCall = vi.fn();

    await expect(
      executeChatTool(
        "book_call",
        { slot_id: "slot-1", name: "Ada", email: "ada@example.com" },
        context({ timezone: undefined, deps: { bookDiscoveryCall } }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "timezone_required" });
    expect(bookDiscoveryCall).not.toHaveBeenCalled();

    const result = await executeChatTool(
      "book_call",
      { slot_id: "slot-1", name: "Ada", email: "ada@example.com" },
      context({
        deps: {
          bookDiscoveryCall: vi.fn().mockResolvedValue({
            booking: {
              requestId: "booking-1",
              slotStart: new Date("2026-10-26T01:00:00.000Z"),
              slotEnd: new Date("2026-10-26T01:30:00.000Z"),
              timezone: "Asia/Manila",
              meetLink: "https://evil.example/meeting",
              calendarLink: "https://evil.example/calendar",
            },
            confirmationEmailSent: true,
            teamEmailSent: true,
          }),
        },
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      meet_link: null,
      calendar_link: null,
      confirmation_email_sent: true,
    });
  });

  it("asks for a new time when a slot was just taken", async () => {
    const getAvailability = vi.fn().mockResolvedValue({ slots: [] });
    const bookDiscoveryCall = vi.fn().mockRejectedValue(new SlotUnavailableError());

    const result = await executeChatTool(
      "book_call",
      { slot_id: "slot-1", name: "Ada", email: "ada@example.com" },
      context({ deps: { bookDiscoveryCall, getAvailability } }),
    );

    expect(result).toMatchObject({ ok: false, error: "slot_unavailable" });
    expect(result.slots).toEqual([]);
  });

  it("sends a solution brief only to the visitor and the fixed team address", async () => {
    emailConfig();
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const result = await executeChatTool(
      "send_solution_brief",
      {
        email: "ada@example.com",
        summary: "We would start by mapping the weekly reporting steps and their owners.",
      },
      context({ deps: { sendEmail } }),
    );

    expect(result).toMatchObject({ ok: true, sent: true, visitor_email_sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: "ada@example.com" });
    expect(sendEmail.mock.calls[1][0]).toMatchObject({ to: "team@clarteon.test" });
  });

  it("blocks prices and promises in a solution brief", async () => {
    emailConfig();
    const sendEmail = vi.fn();

    await expect(
      executeChatTool(
        "send_solution_brief",
        {
          email: "ada@example.com",
          summary: "This will cost around 50,000 pesos and is guaranteed to save time.",
        },
        context({ deps: { sendEmail } }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "pricing_content" });

    await expect(
      executeChatTool(
        "send_solution_brief",
        {
          email: "ada@example.com",
          summary: "We guarantee the automation will work for every process.",
        },
        context({ deps: { sendEmail } }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "promise_content" });

    await expect(
      executeChatTool(
        "send_solution_brief",
        {
          email: "ada@example.com",
          summary: "Your discovery call is confirmed for Monday at nine.",
        },
        context({ deps: { sendEmail } }),
      ),
    ).resolves.toMatchObject({ ok: false, error: "promise_content" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a handoff only to the team", async () => {
    emailConfig();
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await executeChatTool(
      "handoff_to_team",
      { reason: "The visitor needs a person to discuss a contract.", contact: "ada@example.com" },
      context({ deps: { sendEmail } }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: "team@clarteon.test" });
  });
});
