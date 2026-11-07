import { beforeEach, describe, expect, it, vi } from "vitest";
import { runChatTurn } from "@/lib/chat/run";
import type { ChatHistoryMessage, ChatRequest } from "@/lib/chat/schema";
import type { ChatModelResult, ModelToolCall } from "@/lib/chat/types";
import type { ChatToolDependencies } from "@/lib/chat/tools";
import { resetChatUsageForTests } from "@/lib/chat/usage";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { encodeSlotId } from "@/lib/booking/slots";
import { type ActionConfirmation } from "@/lib/chat/confirmation";
import { BookingFailedError, SlotUnavailableError } from "@/lib/booking/errors";
import type { ChatBookingOptions } from "@/lib/chat/types";

const config = {
  GROQ_API_KEY: "test-key",
  LLM_MODEL_PRIMARY: "openai/gpt-oss-120b",
  LLM_MODEL_FALLBACKS: "",
};

function call(id: string, name: string, args: Record<string, unknown>): ModelToolCall {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

function modelStep(step: { text?: string; calls?: ModelToolCall[] }): ChatModelResult {
  return {
    model: "test-model",
    content: step.text ?? "",
    toolCalls: step.calls ?? [],
  };
}

describe("Clara end-to-end conversation", () => {
  beforeEach(() => {
    resetChatUsageForTests();
    resetRateLimitsForTests();
  });

  it("saves a lead and books a call through the real tool layer", async () => {
    const slotId = encodeSlotId(
      new Date("2026-10-26T01:00:00.000Z"),
      new Date("2026-10-26T01:30:00.000Z"),
    );
    const store = {
      save: vi.fn(async (lead: Record<string, unknown>) => ({
        lead: { ...lead, id: "lead-1", createdAt: new Date("2026-10-23T08:00:00.000Z") },
        created: true,
      })),
      updateFromChat: vi.fn(),
    };
    const sendLeadEmails = vi.fn().mockResolvedValue({ team: true, receipt: true });
    const getAvailability = vi.fn().mockResolvedValue({
      slots: [
        {
          id: slotId,
          start: "2026-10-26T01:00:00.000Z",
          end: "2026-10-26T01:30:00.000Z",
        },
      ],
    });
    const bookDiscoveryCall = vi.fn().mockResolvedValue({
      booking: {
        requestId: "booking-1",
        slotStart: new Date("2026-10-26T01:00:00.000Z"),
        slotEnd: new Date("2026-10-26T01:30:00.000Z"),
        timezone: "Asia/Manila",
        meetLink: "https://meet.google.com/abc-defg-hij",
        calendarLink: null,
      },
      confirmationEmailSent: true,
      teamEmailSent: true,
    });

    const toolDependencies = {
      getLeadStore: vi.fn(() => store),
      sendLeadEmails,
      getAvailability,
      bookDiscoveryCall,
    } as unknown as ChatToolDependencies;

    const script = [
      modelStep({
        calls: [
          call("save-1", "save_lead", {
            name: "Ada Lovelace",
            email: "ada@example.com",
            problem_summary: "Manual reporting takes too long every week.",
            team_size: "2-10",
          }),
        ],
      }),
      modelStep({
        calls: [call("availability-1", "check_availability", { timezone: "Asia/Manila" })],
      }),
      modelStep({ text: "I have a few times. The first is Monday at 9:00." }),
      modelStep({
        calls: [
          call("book-1", "book_call", {
            slot_id: slotId,
            name: "Ada Lovelace",
            email: "ada@example.com",
            notes: "Weekly reporting automation.",
          }),
        ],
      }),
    ];

    const streamModel = vi.fn(async (options: { onText: (text: string) => void }) => {
      const next = script.shift();
      if (!next) throw new Error("The scripted model ran out of steps.");
      if (next.content) options.onText(next.content);
      return next;
    });

    const sessionId = crypto.randomUUID();
    const history: ChatHistoryMessage[] = [];
    const replies: string[] = [];
    let pending: ActionConfirmation | undefined;

    async function turn(message: string, confirmationToken?: string): Promise<void> {
      const request: ChatRequest = {
        sessionId,
        message,
        history: [...history],
        timezone: "Asia/Manila",
        confirmationToken,
      };
      let reply = "";
      const result = await runChatTurn({
        request,
        sessionId,
        ip: "203.0.113.7",
        pageUrl: "/contact",
        onConfirmation: (value) => {
          pending = value;
        },
        onText: (text) => {
          reply += text;
        },
        deps: {
          config,
          streamModel: streamModel as never,
          toolDependencies,
          confirmationSecret: "test-secret-for-action-confirmation",
          now: new Date("2026-10-23T08:00:00.000Z"),
          classifyScope: async () => ({ kind: "business", businessMessage: "", language: "en" }),
        },
      });

      expect(result.degraded).toBe(false);
      history.push({ role: "user", content: message }, { role: "assistant", content: reply });
      replies.push(reply);
    }

    await turn("Hi, I need help with reporting. I am Ada, ada@example.com.");
    expect(store.save).not.toHaveBeenCalled();
    expect(pending?.description).toContain("ada@example.com");
    await turn("Confirm this action.", pending?.token);
    await turn("Can we book a discovery call? I am in Asia/Manila.");
    await turn("The first time works. Please book it for Ada Lovelace, ada@example.com.");
    expect(bookDiscoveryCall).not.toHaveBeenCalled();
    expect(pending?.description).toContain("Book a discovery call");
    await turn("Confirm this action.", pending?.token);

    expect(replies[1]).toContain("Your details were saved");
    expect(replies[2]).toContain("I have a few times");
    expect(replies[4]).toContain("Your discovery call is confirmed");
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
        source: "clara-chat",
      }),
    );
    expect(sendLeadEmails).toHaveBeenCalledOnce();
    expect(getAvailability).toHaveBeenCalledWith({
      timezone: "Asia/Manila",
      now: expect.any(Date),
    });
    expect(bookDiscoveryCall).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId,
        name: "Ada Lovelace",
        email: "ada@example.com",
        timezone: "Asia/Manila",
      }),
      {},
    );
    expect(streamModel).toHaveBeenCalledTimes(4);
  });

  it("requires a current, session-bound slot offer and confirms only its reviewed details", async () => {
    const now = new Date("2026-11-07T08:00:00.000Z");
    const sid = crypto.randomUUID();
    const timezone = "Asia/Manila";
    const slots = ["02", "03"].map((hour) => {
      const start = `2026-11-09T${hour}:00:00.000Z`;
      const end = `2026-11-09T${hour}:30:00.000Z`;
      return { start, end, id: encodeSlotId(new Date(start), new Date(end)) };
    });
    const getAvailability = vi.fn().mockResolvedValue({ timezone, slots });
    const bookDiscoveryCall = vi
      .fn()
      .mockRejectedValueOnce(new SlotUnavailableError())
      .mockRejectedValueOnce(new BookingFailedError("store_confirm"))
      .mockResolvedValue({
        booking: {
          requestId: "booking-1",
          slotStart: new Date(slots[1].start),
          slotEnd: new Date(slots[1].end),
          timezone,
          meetLink: "https://meet.google.com/abc-defg-hij",
          calendarLink: null,
        },
        confirmationEmailSent: true,
        teamEmailSent: true,
      });
    const streamModel = vi.fn();
    async function turn(overrides: Partial<ChatRequest>, time = now) {
      const onBookingOptions = vi.fn<(options: ChatBookingOptions) => void>();
      const onConfirmation = vi.fn<(proposal: ActionConfirmation) => void>();
      const onText = vi.fn();
      const onStatus = vi.fn();
      const request = {
        sessionId: sid,
        message: "Review my booking.",
        history: [],
        timezone,
        ...overrides,
      };
      await runChatTurn({
        request,
        sessionId: request.sessionId,
        ip: "203.0.113.7",
        pageUrl: "/",
        onBookingOptions,
        onConfirmation,
        onText,
        onStatus,
        deps: {
          config: { ...config, GROQ_API_KEY: "" },
          streamModel,
          confirmationSecret: "test-confirmation-secret",
          now: time,
          toolDependencies: { getAvailability, bookDiscoveryCall },
        },
      });
      return { onBookingOptions, onConfirmation, onText, onStatus };
    }

    const start = await turn({ booking: { step: "times" } });
    const offer = start.onBookingOptions.mock.lastCall![0].offer;
    const review = {
      step: "review" as const,
      slot_id: slots[0].id,
      offer,
      name: "Test Visitor",
      email: "visitor@example.com",
    };
    const tamperedOffer = `${offer}.`;
    for (const [change, time] of [
      [{ booking: { ...review, offer: tamperedOffer } }, now],
      [{ booking: { ...review, slot_id: "unoffered-slot" } }, now],
      [{ booking: review, sessionId: crypto.randomUUID() }, now],
      [{ booking: review, timezone: "America/New_York" }, now],
      [{ booking: review }, new Date(now.getTime() + 10 * 60_000)],
    ] as const) {
      const rejected = await turn(change, time);
      expect(rejected.onConfirmation).not.toHaveBeenCalled();
      expect(rejected.onBookingOptions).toHaveBeenCalledOnce();
    }
    const minor = await turn({ booking: review, history: [{ role: "user", content: "I am 16." }] });
    expect(minor.onConfirmation).not.toHaveBeenCalled();
    const sensitive = await turn({ booking: { ...review, name: "password: test-secret" } });
    expect(sensitive.onConfirmation).not.toHaveBeenCalled();
    const first = await turn({ booking: review });
    const proposal = first.onConfirmation.mock.lastCall![0];
    expect(proposal.description).toContain("visitor@example.com");
    for (const rejected of [
      { confirmationToken: proposal.token, message: "Do not confirm." },
      { confirmationToken: proposal.token, sessionId: crypto.randomUUID() },
      { confirmationToken: `${proposal.token}.`, message: "Confirm this action." },
    ])
      await turn({ message: "Confirm this action.", ...rejected });
    expect(bookDiscoveryCall).not.toHaveBeenCalled();

    const conflict = await turn({
      message: "Confirm this action.",
      confirmationToken: proposal.token,
    });
    expect(conflict.onText).toHaveBeenCalledWith(
      "That time is no longer available. Pick another time below.",
    );
    const fresh = conflict.onBookingOptions.mock.lastCall![0];
    expect(fresh.slots.map((slot) => slot.id)).toEqual([slots[1].id]);

    const alternate = await turn({
      booking: { ...review, slot_id: slots[1].id, offer: fresh.offer },
    });
    const confirmationToken = alternate.onConfirmation.mock.lastCall![0].token;
    const confirm = { message: "Confirm this action.", confirmationToken };
    const failure = await turn(confirm);
    expect(failure.onStatus).toHaveBeenCalledWith("retry_booking");
    expect(failure.onText.mock.lastCall![0]).not.toContain("Your discovery call is confirmed");
    const success = await turn(confirm);
    expect(success.onText.mock.lastCall![0]).toContain("https://meet.google.com/abc-defg-hij");
    expect(bookDiscoveryCall).toHaveBeenCalledTimes(3);
    expect(bookDiscoveryCall.mock.calls[1][0]).toEqual(bookDiscoveryCall.mock.calls[2][0]);
    expect(bookDiscoveryCall.mock.calls[2][0]).toMatchObject({
      slotId: slots[1].id,
      email: review.email,
      name: review.name,
      timezone,
    });
    expect(streamModel).not.toHaveBeenCalled();
  });
});
