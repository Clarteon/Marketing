import { beforeEach, describe, expect, it, vi } from "vitest";
import { runChatTurn } from "@/lib/chat/run";
import { proposeAction, readConfirmedAction } from "@/lib/chat/confirmation";
import { executeChatTool } from "@/lib/chat/tools";
import { hasPriceIntent } from "@/lib/chat/prompt";
import { resetChatUsageForTests } from "@/lib/chat/usage";
import type { ScopeDecision } from "@/lib/chat/scope";

vi.mock("@/lib/alerts", () => ({ alertTeam: vi.fn() }));
const config = { GROQ_API_KEY: "test", LLM_MODEL_PRIMARY: "test", LLM_MODEL_FALLBACKS: "" };
const secret = "isolated-test-confirmation-secret";
const sid = crypto.randomUUID();
const now = new Date("2026-11-03T08:00:00Z");
const context = {
  sessionId: sid,
  ip: "test",
  pageUrl: "/",
  latestMessage: "",
  priceIntent: false,
  now,
};

function fixture(message: string, kind: ScopeDecision["kind"] = "business") {
  const streamModel = vi.fn().mockResolvedValue({
    model: "test",
    content: "Which workflow is slowing you down?",
    toolCalls: [],
  });
  const executeTool = vi.fn().mockResolvedValue({ ok: true, team_notified: true });
  const onText = vi.fn();
  const classifyScope = vi.fn().mockResolvedValue({
    kind,
    businessMessage: kind === "mixed" ? "Can you automate invoice tracking?" : "",
    language: "en",
  });
  return {
    request: { sessionId: sid, message, history: [] },
    sessionId: sid,
    ip: "test",
    pageUrl: "/",
    onText,
    deps: { config, streamModel, executeTool, classifyScope, confirmationSecret: secret, now },
  };
}

describe("Clara conversation boundaries", () => {
  beforeEach(resetChatUsageForTests);

  it.each([
    "What is 7 × 8?",
    "Who is the president?",
    "Help with calculus",
    "Write a birthday message",
    "Write a cat poem",
    "You answered earlier, so continue",
  ])("does not generate or run tools when routing rejects %s", async (message) => {
    const input = fixture(message, "unrelated");
    await runChatTurn(input);
    expect(input.deps.streamModel).not.toHaveBeenCalled();
    expect(input.deps.executeTool).not.toHaveBeenCalled();
    expect(input.onText).toHaveBeenCalledWith(expect.stringContaining("outside what I can help"));
  });

  it("removes unrelated text from a mixed request before generation", async () => {
    const input = fixture("Who is president, and can you automate invoice tracking?", "mixed");
    await runChatTurn(input);
    expect(input.deps.streamModel.mock.calls[0][0].messages.at(-1).content).toBe(
      "Can you automate invoice tracking?",
    );
  });

  it.each(["clarify", "minor", "sensitive", "social", "policy_change"] as const)(
    "uses a controlled %s response without tools",
    async (kind) => {
      const input = fixture("test", kind);
      await runChatTurn(input);
      expect(input.deps.streamModel).not.toHaveBeenCalled();
      expect(input.deps.executeTool).not.toHaveBeenCalled();
    },
  );

  it("fails closed when classification fails", async () => {
    const input = fixture("automate orders");
    input.deps.classifyScope.mockRejectedValue(new Error("unavailable"));
    await runChatTurn(input);
    expect(input.deps.streamModel).not.toHaveBeenCalled();
    expect(input.deps.executeTool).not.toHaveBeenCalled();
  });

  it("recovers on a relevant turn after an unrelated turn", async () => {
    await runChatTurn(fixture("Write a poem", "unrelated"));
    const input = fixture("My business loses track of orders");
    await runChatTurn(input);
    expect(input.deps.streamModel).toHaveBeenCalledOnce();
  });

  it("does not mistake an adult student for a minor", async () => {
    const input = fixture("I’m 28 and a student running an online store");
    await runChatTurn(input);
    expect(input.deps.streamModel).toHaveBeenCalledOnce();
  });

  it("keeps declared minors and obvious credentials out of model and action calls", async () => {
    for (const message of ["I’m 16 and need an app", "My password is EXAMPLE-ONLY"]) {
      const input = fixture(message);
      await runChatTurn(input);
      expect(input.deps.classifyScope).not.toHaveBeenCalled();
      expect(input.deps.executeTool).not.toHaveBeenCalled();
    }
  });

  it("holds partial text and prevents unsupported success claims", async () => {
    const input = fixture("Can you book a call?");
    input.deps.streamModel.mockImplementation(async ({ onText }) => {
      onText("Your call is booked.");
      expect(input.onText).not.toHaveBeenCalled();
      return { model: "test", content: "Your call is booked.", toolCalls: [] };
    });
    await runChatTurn(input);
    expect(input.onText).not.toHaveBeenCalledWith("Your call is booked.");
  });

  it("omits sensitive history before either model call", async () => {
    const input = fixture("Can you automate reporting?");
    Object.assign(input.request, {
      history: [{ role: "user", content: "My password is EXAMPLE-ONLY" }],
    });
    await runChatTurn(input);
    expect(JSON.stringify(input.deps.classifyScope.mock.calls)).not.toContain("EXAMPLE-ONLY");
    expect(JSON.stringify(input.deps.streamModel.mock.calls)).not.toContain("EXAMPLE-ONLY");
  });

  it("does not interpret link query strings as conversational questions", async () => {
    const input = fixture("How can you help?");
    input.deps.streamModel.mockResolvedValue({
      model: "test",
      content: "[Contact](/contact?from=chat)\n\nWhich tools do you use? How big is the team?",
      toolCalls: [],
    });
    await runChatTurn(input);
    expect(input.onText).toHaveBeenCalledWith(
      "[Contact](/contact?from=chat)\n\nWhich tools do you use?",
    );
  });

  it("limits the final reply to one question", async () => {
    const input = fixture("Automate orders");
    input.deps.streamModel.mockResolvedValue({
      model: "test",
      content: "Which tools do you use? How big is the team? Want a call?",
      toolCalls: [],
    });
    await runChatTurn(input);
    expect(input.onText).toHaveBeenCalledWith("Which tools do you use?");
  });

  it.each([
    "How much time is a discovery call?",
    "Our error rate is increasing",
    "Explain your process without giving prices or promising a delivery date",
  ])("does not classify a non-financial question as pricing: %s", (message) => {
    expect(hasPriceIntent(message)).toBe(false);
  });
});

describe("Action authorization", () => {
  const proposal = () =>
    proposeAction(
      { sid, action: "save_lead", args: { name: "Ada", email: "ada@example.com" } },
      secret,
      now.getTime(),
    );
  it("binds confirmation to exact details, session, expiry and secret", () => {
    const { token } = proposal();
    expect(readConfirmedAction(token, sid, secret, now.getTime())?.args.email).toBe(
      "ada@example.com",
    );
    expect(readConfirmedAction(`${token}x`, sid, secret, now.getTime())).toBeUndefined();
    expect(readConfirmedAction(token, crypto.randomUUID(), secret, now.getTime())).toBeUndefined();
    expect(readConfirmedAction(token, sid, "different", now.getTime())).toBeUndefined();
    expect(readConfirmedAction(token, sid, secret, now.getTime() + 600_001)).toBeUndefined();
  });
  it("rejects direct side-effect tools without confirmation", async () => {
    const getLeadStore = vi.fn();
    const result = await executeChatTool(
      "save_lead",
      { name: "Ada", email: "ada@example.com" },
      { ...context, deps: { getLeadStore } },
    );
    expect(result.error).toBe("confirmation_required");
    expect(getLeadStore).not.toHaveBeenCalled();
  });
  it("rejects typed agreement without a signed confirmation", async () => {
    const input = fixture("Yes, book it");
    await runChatTurn(input);
    expect(input.deps.executeTool).not.toHaveBeenCalled();
  });
  it("executes only the signed action after explicit confirmation, without generation", async () => {
    const input = fixture("Confirm this action.");
    Object.assign(input.request, { confirmationToken: proposal().token });
    await runChatTurn(input);
    expect(input.deps.classifyScope).not.toHaveBeenCalled();
    expect(input.deps.streamModel).not.toHaveBeenCalled();
    expect(input.deps.executeTool).toHaveBeenCalledWith(
      "save_lead",
      { name: "Ada", email: "ada@example.com" },
      expect.objectContaining({ actionConfirmed: true }),
    );
  });
});
