"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { detectedTimezone, TimezoneChoices } from "@/components/chat/TimezoneChoices";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { formatSlotDate, formatSlotTime } from "@/lib/booking/format";
import { CHAT_TURNSTILE_ACTION } from "@/lib/chat/constants";
import { cx } from "@/lib/cx";
import { site } from "@/lib/site";
import styles from "./hero-mini-clara.module.css";

interface MiniChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MiniAvailabilitySlot {
  id: string;
  start: string;
  end: string;
}

const initialPreviewMessages: MiniChatMessage[] = [
  {
    id: "preview-greeting",
    role: "assistant",
    content:
      "Hi, I’m Clara, Clarteon’s AI assistant. Tell me what’s eating up your team’s time and I’ll help figure out the clearest fix.",
  },
  {
    id: "preview-user",
    role: "user",
    content: "Approvals get stuck in email and someone retypes everything.",
  },
  {
    id: "preview-reply",
    role: "assistant",
    content: "Likely fix: business automation. Want me to find a time for a discovery call?",
  },
];

const greetingMessage: MiniChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi, I’m Clara, Clarteon’s AI assistant. Tell me what’s eating up your team’s time and I’ll help figure out the clearest fix.",
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mini-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chatLink(value: string): string | undefined {
  if (value === `mailto:${site.email}`) return value;
  if (/^[\/#]/.test(value) && !/[\\\s]/.test(value) && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return;
    if (
      url.hostname === "clarteon.tech" ||
      url.hostname === "meet.google.com" ||
      url.hostname === "calendar.google.com" ||
      (url.hostname === "www.google.com" && url.pathname.startsWith("/calendar/"))
    ) {
      return url.href;
    }
  } catch {
    return undefined;
  }
}

async function buildFallbackReply(userText: string, timezone?: string): Promise<string> {
  const lower = userText.toLowerCase();
  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("quote") ||
    lower.includes("rate") ||
    lower.includes("budget")
  ) {
    return "Every project is scoped around the problem first, so I don’t quote prices in chat. [Book a free discovery call](/contact#book) or [send a project brief](/contact#brief) and the team will give you a clear recommendation.";
  }
  if (
    lower.includes("book") ||
    lower.includes("call") ||
    lower.includes("schedule") ||
    lower.includes("meet") ||
    lower.includes("time")
  ) {
    const tz = timezone ?? detectedTimezone() ?? "Asia/Manila";
    try {
      const res = await fetch(`/api/booking/availability?timezone=${encodeURIComponent(tz)}`);
      if (res.ok) {
        const body = (await res.json()) as {
          ok?: boolean;
          timezone?: string;
          slots?: MiniAvailabilitySlot[];
        };
        if (body.ok && body.slots && body.slots.length > 0) {
          const sample = body.slots
            .slice(0, 3)
            .map(
              (slot) =>
                `- **${formatSlotDate(slot.start, body.timezone ?? tz)}** at **${formatSlotTime(slot.start, body.timezone ?? tz)}**`,
            )
            .join("\n");
          return `Here are the next available 30-minute Google Meet discovery call slots (${body.timezone ?? tz}):\n${sample}\n\nReply with your **name**, **email**, and **preferred time**, or [confirm your slot directly on the booking calendar](/contact#book).`;
        }
      }
    } catch {
      void 0;
    }
    return "I can help set up a 30-minute Google Meet discovery call. Share your preferred day and timezone here, or [pick a time directly on the booking calendar](/contact#book).";
  }
  if (
    lower.includes("email") ||
    lower.includes("spreadsheet") ||
    lower.includes("copy") ||
    lower.includes("manual") ||
    lower.includes("approval") ||
    lower.includes("invoice")
  ) {
    return "That sounds like a strong fit for workflow automation or system integration, removing manual handoffs so data moves automatically. Would you like me to check available times for a [discovery call](/contact#book) or [send a project brief](/contact#brief)?";
  }
  if (
    lower.includes("support") ||
    lower.includes("chat") ||
    lower.includes("agent") ||
    lower.includes("assistant") ||
    lower.includes("customer")
  ) {
    return "An AI assistant grounded in your approved knowledge can handle common questions and route complex ones to your team. Want me to look up open times for a 30-minute [discovery call](/contact#book)?";
  }
  return "Thanks for sharing that. We start by diagnosing where the bottleneck costs your team the most time, then recommend the smallest practical fix. Would you like me to find a time for a [discovery call](/contact#book) or [send a project brief](/contact#brief)?";
}

export function openClaraChatPanel() {
  if (typeof document === "undefined") return;
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-controls="clara-chat-panel"]',
  );
  if (!trigger) return;
  if (trigger.getAttribute("aria-expanded") !== "true") {
    trigger.click();
  }
}

export function HeroMiniClara({
  className,
  turnstileSiteKey,
}: {
  className?: string;
  turnstileSiteKey?: string;
}) {
  const [draft, setDraft] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<MiniChatMessage[]>(() => [greetingMessage]);
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => createId());
  const [selectedTimezone, setSelectedTimezone] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<{ token: string; description: string } | null>(
    null,
  );
  const [botVerified, setBotVerified] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const tokenRef = useRef("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const visibleMessages = started ? messages : initialPreviewMessages;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !started) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, started, sending, confirmation]);

  async function waitForTurnstileToken(timeoutMs = 2800): Promise<string> {
    if (botVerified || !turnstileSiteKey) return "";
    if (tokenRef.current) return tokenRef.current;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      if (tokenRef.current) return tokenRef.current;
    }
    return tokenRef.current;
  }

  async function sendMiniMessage(
    rawText: string,
    confirmationToken?: string,
    timezoneOverride?: string,
  ) {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    const historyPayload = messages
      .filter((item) => item.id !== "greeting" && item.content.trim().length > 0)
      .slice(-16)
      .map((item) => ({ role: item.role, content: item.content }));

    const userMessage: MiniChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    const assistantId = createId();
    const activeTz = timezoneOverride ?? selectedTimezone ?? detectedTimezone();

    setStarted(true);
    setDraft("");
    setConfirmation(null);
    setSending(true);
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const appendAssistantText = (chunk: string) => {
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, content: item.content + chunk } : item,
        ),
      );
    };

    const replaceAssistantText = (text: string) => {
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, content: text } : item)),
      );
    };

    try {
      const turnstileToken = await waitForTurnstileToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
          history: historyPayload,
          turnstileToken: botVerified ? undefined : turnstileToken || undefined,
          timezone: activeTz,
          pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
          confirmationToken,
        }),
      });

      if (!response.ok || !response.body) {
        if (!botVerified && turnstileSiteKey) {
          tokenRef.current = "";
          setTurnstileKey((value) => value + 1);
        }
        replaceAssistantText(await buildFallbackReply(trimmed, activeTz));
        return;
      }

      setBotVerified(true);
      tokenRef.current = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as {
            type?: string;
            text?: string;
            message?: string;
            token?: string;
            description?: string;
          };
          if (parsed.type === "text" && parsed.text) {
            receivedText = true;
            appendAssistantText(parsed.text);
          } else if (parsed.type === "confirmation" && parsed.token && parsed.description) {
            setConfirmation({ token: parsed.token, description: parsed.description });
          } else if (
            (parsed.type === "degraded" || parsed.type === "error") &&
            !receivedText &&
            parsed.message
          ) {
            receivedText = true;
            replaceAssistantText(parsed.message);
          }
        }
      }

      if (!receivedText) {
        replaceAssistantText(await buildFallbackReply(trimmed, activeTz));
      }
    } catch {
      replaceAssistantText(await buildFallbackReply(trimmed, activeTz));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMiniMessage(draft);
  }

  function resetMiniChat() {
    setStarted(false);
    setMessages([greetingMessage]);
    setDraft("");
    setConfirmation(null);
    setSending(false);
  }

  return (
    <div className={cx(styles.stage, className)} data-testid="hero-mini-clara">
      <div className={styles.backdropCard} aria-hidden="true">
        <svg
          className={styles.watermarkAperture}
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M176 68A82 82 0 1 0 176 172"
            stroke="currentColor"
            strokeWidth="34"
            strokeLinecap="butt"
          />
          <circle cx="122" cy="120" r="24" fill="currentColor" />
        </svg>

        <div className={styles.nextStepCard}>
          <p className={styles.nextStepTitle}>Discovery call on Google Meet</p>
        </div>
      </div>

      <div className={styles.chatCard} role="region" aria-label="Clara assistant preview">
        <div className={styles.chatHeader}>
          <span className={styles.avatarTile} aria-hidden="true">
            <svg
              className={styles.avatarIcon}
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.8 10.6a8 8 0 1 0 0 10.8"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="16.5" cy="16" r="2.2" fill="currentColor" />
            </svg>
          </span>
          <div className={styles.chatHeaderMeta}>
            <p className={styles.chatName}>Clara</p>
            <p className={styles.chatRole}>Clarteon’s AI assistant</p>
          </div>
          {started ? (
            <button
              type="button"
              className={styles.resetMiniBtn}
              aria-label="Reset conversation"
              onClick={resetMiniChat}
            >
              Reset
            </button>
          ) : null}
        </div>

        <div
          ref={messagesContainerRef}
          className={cx(styles.chatMessages, started && styles.chatMessagesScrollable)}
          aria-live={started ? "polite" : undefined}
        >
          {visibleMessages.map((item) => (
            <div
              key={item.id}
              className={item.role === "user" ? styles.userBubble : styles.assistantBubble}
            >
              {item.role === "assistant" ? (
                item.content ? (
                  <MessageMarkdown
                    allowedElements={["p", "strong", "em", "ul", "ol", "li", "a", "br"]}
                    unwrapDisallowed
                    urlTransform={chatLink}
                    components={{
                      a: ({ href, children }) =>
                        href === "#clara-timezone" ? null : href ? (
                          <a href={href}>{children}</a>
                        ) : (
                          <span>{children}</span>
                        ),
                    }}
                  >
                    {item.content}
                  </MessageMarkdown>
                ) : sending ? (
                  <p>Clara is thinking…</p>
                ) : null
              ) : (
                item.content
              )}

              {started &&
              item.role === "assistant" &&
              item.id === messages.at(-1)?.id &&
              item.content.includes("](#clara-timezone)") &&
              !sending &&
              !confirmation ? (
                <TimezoneChoices
                  onChoose={(zone, label) => {
                    setSelectedTimezone(zone);
                    void sendMiniMessage(
                      `Show discovery call times in ${label} (${zone}).`,
                      undefined,
                      zone,
                    );
                  }}
                />
              ) : null}
            </div>
          ))}

          {confirmation ? (
            <div
              className={styles.confirmationBox}
              role="group"
              aria-label="Confirm discovery call details"
            >
              <p className={styles.confirmationText}>{confirmation.description}</p>
              <div className={styles.confirmationActions}>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  disabled={sending}
                  onClick={() => void sendMiniMessage("Confirm this action.", confirmation.token)}
                >
                  Confirm booking
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={sending}
                  onClick={() => setConfirmation(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {Boolean(turnstileSiteKey) && !botVerified ? (
          <div className={styles.hiddenTurnstile} aria-hidden="true">
            <TurnstileWidget
              key={turnstileKey}
              siteKey={turnstileSiteKey ?? ""}
              action={CHAT_TURNSTILE_ACTION}
              onToken={(nextToken) => {
                tokenRef.current = nextToken;
              }}
              onError={() => {
                tokenRef.current = "";
              }}
            />
          </div>
        ) : null}

        <form className={styles.composerForm} onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your message"
            aria-label="Message Clara in hero"
            disabled={sending}
            className={styles.composerInput}
          />
          <button
            type="submit"
            className={styles.composerSend}
            disabled={sending}
            aria-label="Send to Clara"
          >
            <svg
              className={styles.composerSendIcon}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4.5 10h11M11 5.5 15.5 10 11 14.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        {started ? (
          <p className={styles.privacyNote}>
            AI assistant ·{" "}
            <Link href="/privacy" className={styles.privacyLink}>
              Privacy
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
