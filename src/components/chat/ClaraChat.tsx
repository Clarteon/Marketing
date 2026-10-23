"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { CHAT_TURNSTILE_ACTION } from "@/lib/chat/constants";
import { site } from "@/lib/site";
import styles from "./chat.module.css";

interface ClaraChatProps {
  turnstileSiteKey?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatEvent {
  type: "text" | "status" | "degraded" | "error" | "done";
  text?: string;
  status?: string;
  message?: string;
  code?: string;
}

const MAX_CLIENT_MESSAGES = 20;
const WELCOME = "Hi, I’m Clara, Clarteon’s AI assistant. What is slowing your team down right now?";

function newSessionId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function errorMessage(code: string): string {
  switch (code) {
    case "rate_limited":
      return "I’m getting a lot of messages right now. Please wait a moment and try again.";
    case "bot_check_required":
    case "bot_check_failed":
      return "Please complete the quick check below, then send your message again.";
    case "message_limit":
      return "This chat has reached its limit. Please send a project brief or book a call so a person can pick it up.";
    case "chat_unavailable":
    case "bot_check_unavailable":
      return "Chat is offline right now. You can still send a project brief or book a call.";
    default:
      return "I couldn’t reach the server. Please try again, or send a project brief.";
  }
}

async function readEvents(response: Response, onEvent: (event: ChatEvent) => void): Promise<void> {
  if (!response.body) throw new Error("The reply stream was empty.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (line) onEvent(JSON.parse(line) as ChatEvent);
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) onEvent(JSON.parse(tail.trim()) as ChatEvent);
}

export function ClaraChat({ turnstileSiteKey }: ClaraChatProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [botVerified, setBotVerified] = useState(false);
  const [degraded, setDegraded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  const chatAvailable = Boolean(turnstileSiteKey);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        abortRef.current?.abort();
        abortRef.current = null;
        sendingRef.current = false;
        setSending(false);
        setOpen(false);
        bubbleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending, open, degraded, error]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function acceptPrivacy() {
    setPrivacyAccepted(true);
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    setOpen(false);
    bubbleRef.current?.focus();
  }

  function handleHttpError(code: string) {
    if (code === "bot_check_required" || code === "bot_check_failed") {
      setBotVerified(false);
      setToken("");
      setTurnstileKey((value) => value + 1);
    }
    if (
      code === "chat_unavailable" ||
      code === "bot_check_unavailable" ||
      code === "message_limit"
    ) {
      setDegraded(errorMessage(code));
      return;
    }
    setError(errorMessage(code));
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || sendingRef.current || !privacyAccepted) return;
    if (!chatAvailable) {
      setDegraded("Chat is offline right now. You can still send a project brief or book a call.");
      return;
    }
    if (!botVerified && !token) {
      setError("Please complete the quick check below, then send your message.");
      return;
    }
    if (messages.length + 1 > MAX_CLIENT_MESSAGES) {
      setDegraded(errorMessage("message_limit"));
      return;
    }

    sessionIdRef.current ??= newSessionId();
    const history = messages.slice(-(MAX_CLIENT_MESSAGES - 1)).map((item) => ({
      role: item.role,
      content: item.content,
    }));
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: message };
    const assistantId = `assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);
    setDegraded(null);
    setSending(true);
    sendingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message,
          history,
          turnstileToken: botVerified ? undefined : token,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          pageUrl: window.location.pathname,
        }),
      });

      if (!response.ok) {
        let code = "request_failed";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string") code = body.error;
        } catch {
          // Keep the generic code.
        }
        handleHttpError(code);
        return;
      }

      setBotVerified(true);
      setToken("");

      let receivedText = false;
      let degradedMessage: string | null = null;

      await readEvents(response, (event) => {
        if (event.type === "text" && event.text) {
          receivedText = true;
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId ? { ...item, content: item.content + event.text } : item,
            ),
          );
        } else if (event.type === "degraded") {
          degradedMessage = event.message ?? errorMessage("chat_unavailable");
          setDegraded(degradedMessage);
        } else if (event.type === "error") {
          setError(event.message ?? "Something went wrong on my side. Please try again.");
        }
      });

      if (!receivedText && !degradedMessage) {
        setError("I didn’t get a reply. Please try again, or send a project brief.");
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError("I couldn’t reach the server. Please try again, or send a project brief.");
      }
    } finally {
      setMessages((current) =>
        current.filter((item) => !(item.id === assistantId && item.content.length === 0)),
      );
      abortRef.current = null;
      sendingRef.current = false;
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  if (pathname?.startsWith("/admin")) return null;

  const activeDegraded =
    degraded ??
    (!chatAvailable && privacyAccepted
      ? "Chat is offline right now. You can still send a project brief or book a call."
      : null);

  const canSend =
    chatAvailable &&
    Boolean(input.trim()) &&
    !sending &&
    (botVerified || Boolean(token)) &&
    !activeDegraded;

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        className={`${styles.bubble} ${open ? styles.bubbleOpen : ""}`}
        aria-label="Chat with Clara"
        aria-expanded={open}
        aria-controls="clara-chat-panel"
        onClick={() => (open ? closeChat() : setOpen(true))}
      >
        <span className={styles.pulseRing} aria-hidden="true" />
        <span className={styles.pulseRingSecond} aria-hidden="true" />

        <span className={styles.beacon} aria-hidden="true">
          <span className={styles.beaconDot} />
          <span className={styles.beaconPing} />
        </span>

        <span className={styles.tooltip} role="tooltip" aria-hidden="true">
          {open ? "Close chat" : "Chat with Clara"}
        </span>

        <span className={styles.srOnly}>Chat with Clara</span>

        <span className={styles.iconContainer} aria-hidden="true">
          <svg
            className={`${styles.icon} ${styles.chatIcon}`}
            viewBox="0 0 24 24"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" className={styles.dot1} />
            <circle cx="12" cy="10.5" r="1.2" fill="currentColor" className={styles.dot2} />
            <circle cx="15.5" cy="10.5" r="1.2" fill="currentColor" className={styles.dot3} />
          </svg>

          <svg
            className={`${styles.icon} ${styles.closeIcon}`}
            viewBox="0 0 24 24"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <section
          ref={panelRef}
          id="clara-chat-panel"
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clara-chat-title"
        >
          <header className={styles.header}>
            <div>
              <h2 id="clara-chat-title" className={styles.title}>
                Clara
              </h2>
              <p className={styles.subtitle}>Clarteon’s AI assistant</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              onClick={closeChat}
              aria-label="Close chat"
            >
              Close
            </button>
          </header>

          <div
            ref={listRef}
            className={styles.messages}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!privacyAccepted ? (
              <div className={styles.privacy}>
                <h3 className={styles.privacyTitle}>Before we start</h3>
                <p>
                  I’m Clara, Clarteon’s AI assistant. Your messages are sent to our AI provider,
                  Groq, so I can reply. Please don’t share passwords, payment details or other
                  sensitive information.
                </p>
                <p>
                  Read the{" "}
                  <Link href="/privacy" className={styles.inlineLink}>
                    Privacy page
                  </Link>{" "}
                  for how chats are handled.
                </p>
                <Button type="button" onClick={acceptPrivacy}>
                  I understand
                </Button>
              </div>
            ) : (
              <>
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.message} ${
                      item.role === "user" ? styles.userMessage : styles.assistantMessage
                    }`}
                  >
                    <span className={styles.speaker}>{item.role === "user" ? "You" : "Clara"}</span>
                    <p className={styles.messageText}>{item.content}</p>
                  </div>
                ))}

                {sending ? (
                  <div className={`${styles.message} ${styles.assistantMessage}`}>
                    <span className={styles.speaker}>Clara</span>
                    <p className={styles.typing} aria-label="Clara is replying">
                      <span />
                      <span />
                      <span />
                    </p>
                  </div>
                ) : null}

                {activeDegraded ? (
                  <div className={styles.degraded} role="status">
                    <p>{activeDegraded}</p>
                    <div className={styles.degradedActions}>
                      <Button href="/contact#brief" variant="secondary">
                        Send a project brief
                      </Button>
                      <Button href="/contact#book">Book a call</Button>
                      <Button href={`mailto:${site.email}`} variant="secondary">
                        Email the team
                      </Button>
                    </div>
                  </div>
                ) : null}

                {messages.length <= 1 && !sending && !activeDegraded ? (
                  <div className={styles.quickStarts} aria-label="Quick start questions">
                    <button
                      type="button"
                      onClick={() => void sendMessage("I have a problem to solve.")}
                    >
                      I have a problem to solve
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMessage("What does Clarteon do?")}
                    >
                      What does Clarteon do?
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMessage("I’d like to book a discovery call.")}
                    >
                      Book a call
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {privacyAccepted ? (
            <div className={styles.composer}>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              {!chatAvailable ? (
                <p className={styles.offline}>
                  Chat is offline right now. Use the project brief, booking or email link above.
                </p>
              ) : !botVerified ? (
                <div className={styles.botCheck}>
                  <TurnstileWidget
                    key={turnstileKey}
                    siteKey={turnstileSiteKey ?? ""}
                    action={CHAT_TURNSTILE_ACTION}
                    onToken={setToken}
                    onError={() => setToken("")}
                  />
                </div>
              ) : null}

              <form className={styles.form} onSubmit={onSubmit}>
                <label htmlFor="clara-message" className={styles.srOnly}>
                  Your message to Clara
                </label>
                <textarea
                  ref={inputRef}
                  id="clara-message"
                  className={styles.input}
                  rows={2}
                  maxLength={2000}
                  value={input}
                  placeholder={
                    activeDegraded ? "Chat is paused. Use the links above." : "Type your message…"
                  }
                  disabled={!chatAvailable || Boolean(activeDegraded) || sending}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                />
                <button
                  type="submit"
                  className={styles.send}
                  disabled={!canSend}
                  aria-label="Send message"
                >
                  Send
                </button>
              </form>
              <p className={styles.footnote}>
                Clara is an AI assistant. For anything important, a person can help.{" "}
                <Link href="/privacy" className={styles.inlineLink}>
                  Privacy
                </Link>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
