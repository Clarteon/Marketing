import { describe, it } from "vitest";
import { streamModelCompletion } from "@/lib/chat/model";
import { buildModelMessages, buildSystemPrompt } from "@/lib/chat/prompt";
import { chatTools } from "@/lib/chat/tools";

const key = process.env.GROQ_API_KEY ?? "";

async function probe(label: string, extra: string) {
  const systemPrompt = `${buildSystemPrompt(new Date("2026-10-24T08:00:00.000Z"))}\n\n${extra}`;
  const messages = buildModelMessages({
    systemPrompt,
    history: [],
    message: "Book me tomorrow at 3. I'm in Asia/Manila.",
  });
  const result = await streamModelCompletion({
    apiKey: key,
    models: ["openai/gpt-oss-120b"],
    messages,
    tools: chatTools,
    onText: () => undefined,
    timeoutMs: 20_000,
    turnTimeoutMs: 50_000,
  });
  console.log(
    JSON.stringify({
      label,
      model: result.model,
      content: result.content.slice(0, 300),
      tools: result.toolCalls.map((call) => ({
        name: call.function.name,
        args: call.function.arguments,
      })),
    }),
  );
}

describe.skipIf(!key)("temporary prompt probe", () => {
  it("compares tool-use instructions", async () => {
    await probe("current", "");
    await probe(
      "mandatory",
      "<mandatory_tools>\nFor any booking request, you must call check_availability before saying anything about times or availability. Never invent a time, a slot, a booking or a calendar failure. If you have not called the tool, do not describe what it would return.\n</mandatory_tools>",
    );
  }, 120_000);
});
