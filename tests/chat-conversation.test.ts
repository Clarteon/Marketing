import { beforeEach, describe, expect, it, vi } from "vitest";
import { runChatTurn } from "@/lib/chat/run";
import type { ChatHistoryMessage, ChatRequest } from "@/lib/chat/schema";
import type { ChatModelResult, ModelToolCall } from "@/lib/chat/types";
import type { ChatToolDependencies } from "@/lib/chat/tools";
import { resetChatUsageForTests } from "@/lib/chat/usage";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { encodeSlotId } from "@/lib/booking/slots";
import type { ActionConfirmation } from "@/lib/chat/confirmation";

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
});
