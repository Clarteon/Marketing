"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MessageMarkdown as ReactMarkdown } from "./MessageMarkdown";
import { Button } from "@/components/ui/Button";
import { preloadTurnstile, TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { BOOKING_DEFAULT_TIMEZONE } from "@/lib/booking/constants";
import { CHAT_MESSAGE_MAX_CHARS, CHAT_TURNSTILE_ACTION } from "@/lib/chat/constants";
import type { ChatBookingStep } from "@/lib/chat/schema";
import type { ChatBookingOptions, ChatEvent } from "@/lib/chat/types";
import { site } from "@/lib/site";
import { BookingChoices, type BookingDraft } from "./BookingChoices";
import styles from "./chat.module.css";
import { detectedTimezone, TimezoneChoices } from "./TimezoneChoices";
import { useDictation } from "./useDictation";
import { useReadAloud } from "./useReadAloud";

interface ClaraChatProps {
  turnstileSiteKey?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  readable?: boolean;
}

const MAX_CLIENT_MESSAGES = 20;
const EMPTY_BOOKING_DRAFT: BookingDraft = { name: "", email: "" };
const DICTATION_ENABLED = process.env.NEXT_PUBLIC_CLARA_DICTATION === "true";
const READ_ALOUD_ENABLED = process.env.NEXT_PUBLIC_CLARA_READ_ALOUD !== "false";
const WELCOME = "Hi, I’m Clara, Clarteon’s AI assistant. What is slowing your team down right now?";
const BOT_CHECK_PENDING = "Please complete the quick check below, then send your message.";

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
    )
      return url.href;
  } catch {
    return undefined;
  }
}

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
    case "invalid_input":
      return "Please check your details and try again.";
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
  const [inHeroSection, setInHeroSection] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState<string>();
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [botVerified, setBotVerified] = useState(false);
  const [degraded, setDegraded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    token: string;
    description: string;
    action?: string;
    retry?: boolean;
  } | null>(null);
  const [bookingOptions, setBookingOptions] = useState<ChatBookingOptions | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(EMPTY_BOOKING_DRAFT);

  const panelRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const voiceFocus = useRef<"mic" | "draft" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  const chatAvailable = Boolean(turnstileSiteKey);
  const dictation = useDictation();
  const readAloud = useReadAloud(open && privacyAccepted && READ_ALOUD_ENABLED);
  const cancelDictation = dictation.cancel;
  const stopReadAloud = readAloud.stop;
  const voicePhase = dictation.phase;
  const voiceBusy = voicePhase !== "idle";
  const recording = voicePhase === "recording";
  const micLabel = recording ? "Stop recording" : "Record a message";
  const discardLabel = recording ? "Discard recording" : "Cancel dictation";
  const showMic =
    open &&
    DICTATION_ENABLED &&
    chatAvailable &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    typeof OfflineAudioContext !== "undefined";

  const closeChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    voiceFocus.current = null;
    cancelDictation();
    stopReadAloud();
    setOpen(false);
    bubbleRef.current?.focus();
  }, [cancelDictation, stopReadAloud]);

  useEffect(() => {
    let rafId: number | null = null;
    let lastInHero: boolean | null = null;
    const heroMini = document.querySelector<HTMLElement>('[data-testid="hero-mini-clara"]');
    const heroSection = heroMini ? (heroMini.closest("section") ?? heroMini) : null;

    const evaluateHeroVisibility = () => {
      rafId = null;
      const next = heroSection ? heroSection.getBoundingClientRect().bottom > 140 : false;
      if (lastInHero !== next) {
        lastInHero = next;
        setInHeroSection(next);
      }
    };

    const scheduleCheck = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(evaluateHeroVisibility);
      }
    };

    evaluateHeroVisibility();
    if (!heroSection) return;

    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck, { passive: true });
    return () => {
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    if (!privacyAccepted) {
      const initialFocus =
        panelRef.current?.querySelector<HTMLElement>("[data-chat-initial-focus]:not([disabled])") ??
        panelRef.current?.querySelector<HTMLElement>("button:not([disabled])") ??
        panelRef.current?.querySelector<HTMLElement>("a[href]");
      initialFocus?.focus();
    } else {
      inputRef.current?.focus();
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeChat();
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
  }, [closeChat, open, privacyAccepted]);

  useEffect(() => {
    if (!open || !voiceFocus.current) return;

    const control =
      voicePhase === "recording" || voicePhase === "idle"
        ? micButtonRef.current
        : discardButtonRef.current;
    const active = document.activeElement;
    if (active === document.body || control?.form?.contains(active)) {
      const target =
        voicePhase === "idle" && (voiceFocus.current === "draft" || control?.disabled)
          ? inputRef.current
          : control;
      target?.focus({ preventScroll: true });
    }
    if (voicePhase === "idle") voiceFocus.current = null;
  }, [open, voicePhase]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const visualViewport = window.visualViewport;
    if (!panel || !visualViewport) return;

    const updateVisibleViewport = () => {
      const keyboardCoversViewport =
        (document.activeElement === inputRef.current ||
          (document.activeElement instanceof HTMLInputElement &&
            panel.contains(document.activeElement))) &&
        visualViewport.offsetTop + visualViewport.height < window.innerHeight - 100;

      if (!keyboardCoversViewport) {
        panel.style.removeProperty("--clara-visible-height");
        panel.style.removeProperty("--clara-visible-top");
        panel.style.removeProperty("--clara-visible-bottom");
        return;
      }

      panel.style.setProperty("--clara-visible-height", `${visualViewport.height}px`);
      panel.style.setProperty("--clara-visible-top", `${visualViewport.offsetTop}px`);
      panel.style.setProperty(
        "--clara-visible-bottom",
        `${Math.max(0, window.innerHeight - visualViewport.offsetTop - visualViewport.height)}px`,
      );
    };

    visualViewport.addEventListener("resize", updateVisibleViewport);
    visualViewport.addEventListener("scroll", updateVisibleViewport);
    updateVisibleViewport();

    return () => {
      visualViewport.removeEventListener("resize", updateVisibleViewport);
      visualViewport.removeEventListener("scroll", updateVisibleViewport);
      panel.style.removeProperty("--clara-visible-height");
      panel.style.removeProperty("--clara-visible-top");
      panel.style.removeProperty("--clara-visible-bottom");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending, open, degraded, error]);

  useEffect(() => {
    if (open && !sending && confirmation?.action === "book_call") reviewRef.current?.focus();
  }, [confirmation, open, sending]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function acceptPrivacy() {
    setPrivacyAccepted(true);
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function resetChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    voiceFocus.current = null;
    cancelDictation();
    stopReadAloud();
    sessionIdRef.current = newSessionId();
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    setInput("");
    setError(null);
    setDegraded(null);
    setConfirmation(null);
    setBookingOptions(null);
    setBookingDraft(EMPTY_BOOKING_DRAFT);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function refreshBotCheck() {
    setBotVerified(false);
    setToken("");
    setTurnstileKey((value) => value + 1);
  }

  function handleHttpError(code: string) {
    if (code === "bot_check_required" || code === "bot_check_failed") {
      refreshBotCheck();
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

  async function transcribe(audio: Blob, signal: AbortSignal) {
    sessionIdRef.current ??= newSessionId();
    const headers = new Headers({
      "Content-Type": "audio/wav",
      "X-Chat-Session": sessionIdRef.current,
    });
    let refreshCheck = !botVerified;
    if (refreshCheck) {
      headers.set("X-Turnstile-Token", token);
      setToken("");
    }

    try {
      const response = await fetch("/api/chat/transcribe", {
        method: "POST",
        headers,
        body: audio,
        signal,
      });
      signal.throwIfAborted();
      if (response.headers.get("X-Chat-Session-Verified") === "1") {
        refreshCheck = false;
        setBotVerified(true);
        setToken("");
      }
      const result = (await response.json()) as { text?: unknown; error?: string };
      signal.throwIfAborted();

      if (result.error === "bot_check_required" || result.error === "bot_check_failed") {
        refreshCheck = true;
        return "Complete the quick check, then try recording again.";
      }
      if (response.status === 429) return "Voice is busy right now. You can still type.";
      if (result.error === "no_speech")
        return "I didn’t hear anything. Try again or type your message.";
      if (!response.ok || typeof result.text !== "string") {
        return "I couldn’t turn that recording into text. You can still type.";
      }

      const transcript = result.text;
      setInput((draft) =>
        `${draft}${draft && !/\s$/.test(draft) ? " " : ""}${transcript}`.slice(
          0,
          CHAT_MESSAGE_MAX_CHARS,
        ),
      );
      voiceFocus.current = "draft";
    } catch {
      return "I couldn’t reach dictation. You can still type.";
    } finally {
      if (refreshCheck) refreshBotCheck();
    }
  }

  async function sendMessage(
    raw: string,
    options: { confirmationToken?: string; timezone?: string; booking?: ChatBookingStep } = {},
  ) {
    const { confirmationToken, booking } = options;
    const message = raw.trim();
    if (!message || sendingRef.current || dictation.active() || !privacyAccepted) return;
    if (!chatAvailable) {
      setDegraded("Chat is offline right now. You can still send a project brief or book a call.");
      return;
    }
    if (!botVerified && !token) {
      setError(BOT_CHECK_PENDING);
      return;
    }
    if (messages.length + 1 > MAX_CLIENT_MESSAGES && !confirmationToken) {
      setDegraded(errorMessage("message_limit"));
      return;
    }

    sessionIdRef.current ??= newSessionId();
    const history = messages.slice(-(MAX_CLIENT_MESSAGES - 1)).map((item) => ({
      role: item.role,
      content: item.content,
    }));
    const bookingConfirmation =
      confirmation?.action === "book_call" && confirmation.token === confirmationToken
        ? confirmation
        : null;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: bookingConfirmation ? "Confirm booking" : message,
    };
    const assistantId = `assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);
    setDegraded(null);
    setConfirmation(null);
    setSending(true);
    sendingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    let restoreBookingConfirmation = Boolean(bookingConfirmation);

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
          timezone: options.timezone ?? selectedTimezone ?? detectedTimezone(),
          pageUrl: window.location.pathname,
          confirmationToken,
          booking,
        }),
      });

      if (!response.ok) {
        let code = "request_failed";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string") code = body.error;
        } catch {
          void 0;
        }
        handleHttpError(code);
        return;
      }

      setBotVerified(true);
      setToken("");

      let receivedText = false;
      let completed = false;
      let failed = false;
      let degradedMessage: string | null = null;
      let receivedOptions = false;
      let retryBooking = false;
      let invalidConfirmation = false;

      await readEvents(response, (event) => {
        if (event.type === "text" && event.text) {
          receivedText = true;
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId ? { ...item, content: item.content + event.text } : item,
            ),
          );
        } else if (event.type === "confirmation" && event.token && event.description) {
          setConfirmation({
            token: event.token,
            description: event.description,
            action: event.action,
          });
        } else if (event.type === "booking_options" && event.bookingOptions) {
          receivedOptions = true;
          setBookingOptions(event.bookingOptions);
          setBookingDraft((current) => ({ ...current, slotId: undefined }));
        } else if (event.type === "status" && event.status === "retry_booking") {
          retryBooking = true;
        } else if (event.type === "status" && event.status === "confirmation_invalid") {
          invalidConfirmation = true;
        } else if (event.type === "degraded") {
          failed = true;
          degradedMessage = event.message ?? errorMessage("chat_unavailable");
          setDegraded(degradedMessage);
        } else if (event.type === "error") {
          failed = true;
          setError(event.message ?? "Something went wrong on my side. Please try again.");
        } else if (event.type === "done") {
          completed = true;
        }
      });

      if (receivedText && completed && !failed && !controller.signal.aborted) {
        if (bookingConfirmation && !retryBooking) {
          restoreBookingConfirmation = false;
          if (!receivedOptions && !invalidConfirmation) {
            setBookingOptions(null);
            setBookingDraft(EMPTY_BOOKING_DRAFT);
          }
        }
        setMessages((current) =>
          current.map((item) => (item.id === assistantId ? { ...item, readable: true } : item)),
        );
      }

      if (!receivedText && !degradedMessage) {
        setError("I didn’t get a reply. Please try again, or send a project brief.");
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError("I couldn’t reach the server. Please try again, or send a project brief.");
      }
    } finally {
      if (restoreBookingConfirmation && bookingConfirmation) {
        setConfirmation({ ...bookingConfirmation, retry: true });
      }
      setMessages((current) =>
        current.filter((item) => !(item.id === assistantId && item.content.length === 0)),
      );
      abortRef.current = null;
      sendingRef.current = false;
      setSending(false);
    }
  }

  function showBookingTimes(timezone: string, from?: string) {
    setSelectedTimezone(timezone);
    void sendMessage(
      from ? "Show more discovery call times." : "I’d like to see discovery call times.",
      {
        timezone,
        booking: { step: "times", from },
      },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!botVerified && !token) return;
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
    !voiceBusy &&
    (botVerified || Boolean(token)) &&
    !activeDegraded;

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        className={`${styles.bubble} ${open ? styles.bubbleOpen : ""} ${
          inHeroSection && !open ? styles.bubbleHeroHidden : ""
        }`}
        aria-label="Chat with Clara"
        aria-expanded={open}
        aria-controls="clara-chat-panel"
        onClick={() => {
          if (open) {
            closeChat();
            return;
          }
          if (chatAvailable && !botVerified) preloadTurnstile();
          setOpen(true);
        }}
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
          data-stage={privacyAccepted ? "chat" : "consent"}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clara-chat-title"
        >
          <header className={styles.header}>
            <div className={styles.headerIdentity}>
              <span className={styles.headerAvatar} aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="9" fill="#C6F432" />
                  <path
                    d="M21.3 10a8 8 0 1 0 0 12"
                    stroke="#0A0A0A"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <circle cx="16" cy="16" r="2.6" fill="#0A0A0A" />
                </svg>
              </span>
              <div>
                <h2 id="clara-chat-title" className={styles.title}>
                  Clara
                </h2>
                <p className={styles.subtitle}>Clarteon’s AI assistant</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              {privacyAccepted ? (
                <button
                  type="button"
                  className={styles.resetButton}
                  aria-label="Reset conversation"
                  onClick={resetChat}
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close chat"
                onClick={closeChat}
              >
                Close
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            className={styles.messages}
            data-stage={privacyAccepted ? "chat" : "consent"}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!privacyAccepted ? (
              <div className={styles.privacy}>
                <div className={styles.privacyBody}>
                  <span className={styles.privacyBadge}>Private session</span>
                  <h3 className={styles.privacyTitle}>Before we start</h3>
                  <p className={styles.privacyLead}>
                    I’m Clara, Clarteon’s AI assistant. Your messages are sent to our AI provider so
                    I can reply. Please don’t share passwords, payment details or other sensitive
                    information.
                  </p>
                  {showMic ? (
                    <p className={styles.privacyLead}>
                      If you record a message, audio is turned into text so it can be sent.
                    </p>
                  ) : null}
                  <ul className={styles.privacyHighlights} aria-label="What Clara can help with">
                    <li>Diagnose workflow bottlenecks and manual admin</li>
                    <li>Check live availability and book a Google Meet call</li>
                    <li>Send a project brief to the Clarteon team</li>
                  </ul>
                </div>
                <div className={styles.privacyFooter}>
                  <p className={styles.privacyNote}>
                    Read the{" "}
                    <Link href="/privacy" className={styles.inlineLink}>
                      Privacy page
                    </Link>{" "}
                    for how chats are handled.
                  </p>
                  <Button
                    type="button"
                    data-chat-initial-focus
                    className={styles.privacyAcceptButton}
                    onClick={acceptPrivacy}
                  >
                    I understand
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((item) => {
                  const isPendingReply = item.role === "assistant" && item.content.length === 0;
                  if (isPendingReply && !sending) return null;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.message} ${
                        item.role === "user" ? styles.userMessage : styles.assistantMessage
                      }`}
                    >
                      <span className={styles.speaker}>
                        {item.role === "user" ? "You" : "Clara"}
                      </span>
                      {item.role === "assistant" ? (
                        isPendingReply ? (
                          <p className={styles.typing} aria-label="Clara is replying">
                            <span />
                            <span />
                            <span />
                          </p>
                        ) : (
                          <div className={styles.assistantText} data-clara-reply>
                            <ReactMarkdown
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
                            </ReactMarkdown>
                          </div>
                        )
                      ) : (
                        <p className={styles.messageText}>{item.content}</p>
                      )}
                      {readAloud.supported && item.readable && !isPendingReply ? (
                        <button
                          type="button"
                          className={styles.voiceButton}
                          disabled={voiceBusy}
                          onClick={(event) => {
                            if (readAloud.speakingId === item.id) {
                              stopReadAloud();
                              return;
                            }
                            const reply =
                              event.currentTarget.parentElement?.querySelector<HTMLElement>(
                                "[data-clara-reply]",
                              );
                            readAloud.speak(item.id, reply?.innerText ?? item.content);
                          }}
                        >
                          {readAloud.speakingId === item.id ? "Stop reading" : "Read aloud"}
                        </button>
                      ) : null}
                      {item.role === "assistant" &&
                      item.id === messages.at(-1)?.id &&
                      item.content.includes("](#clara-timezone)") &&
                      !sending &&
                      !activeDegraded &&
                      !error &&
                      !confirmation ? (
                        <TimezoneChoices
                          onChoose={(zone, label) => {
                            setSelectedTimezone(zone);
                            void sendMessage(`Show discovery call times in ${label} (${zone}).`, {
                              timezone: zone,
                            });
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}

                {bookingOptions && !confirmation && !sending && !activeDegraded ? (
                  <BookingChoices
                    options={bookingOptions}
                    draft={bookingDraft}
                    disabled={voiceBusy}
                    onDraft={setBookingDraft}
                    onTimes={showBookingTimes}
                    onReview={(booking, timezone) =>
                      void sendMessage("Review my booking.", { booking, timezone })
                    }
                  />
                ) : null}

                {confirmation ? (
                  <div
                    ref={reviewRef}
                    className={styles.degraded}
                    role="group"
                    tabIndex={-1}
                    aria-label="Review action details"
                  >
                    <p className={styles.messageText}>{confirmation.description}</p>
                    <div className={styles.degradedActions}>
                      <Button
                        type="button"
                        disabled={sending || voiceBusy}
                        onClick={() =>
                          void sendMessage("Confirm this action.", {
                            confirmationToken: confirmation.token,
                          })
                        }
                      >
                        {confirmation.action === "book_call"
                          ? confirmation.retry
                            ? "Retry booking"
                            : "Confirm booking"
                          : "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={sending}
                        onClick={() => setConfirmation(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {confirmation.action !== "book_call" ? (
                      <p>
                        Only confirm if these details are correct. You can cancel or ask for
                        changes.
                      </p>
                    ) : null}
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
                      disabled={voiceBusy || (chatAvailable && !botVerified && !token)}
                      onClick={() => void sendMessage("I have a problem to solve.")}
                    >
                      I have a problem to solve
                    </button>
                    <button
                      type="button"
                      disabled={voiceBusy || (chatAvailable && !botVerified && !token)}
                      onClick={() => void sendMessage("What does Clarteon do?")}
                    >
                      What does Clarteon do?
                    </button>
                    <button
                      type="button"
                      disabled={voiceBusy || (chatAvailable && !botVerified && !token)}
                      onClick={() =>
                        showBookingTimes(
                          selectedTimezone ?? detectedTimezone() ?? BOOKING_DEFAULT_TIMEZONE,
                        )
                      }
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
              {dictation.error || readAloud.error ? (
                <p className={styles.error} role="alert">
                  {dictation.error || readAloud.error}
                </p>
              ) : null}

              {!chatAvailable ? (
                <p className={styles.offline}>
                  Chat is offline right now. Use the project brief, booking or email link above.
                </p>
              ) : !botVerified ? (
                <div className={styles.botCheck} hidden={Boolean(token)}>
                  <TurnstileWidget
                    key={turnstileKey}
                    siteKey={turnstileSiteKey ?? ""}
                    action={CHAT_TURNSTILE_ACTION}
                    appearance="interaction-only"
                    onToken={(verifiedToken) => {
                      setToken(verifiedToken);
                      setError((current) => (current === BOT_CHECK_PENDING ? null : current));
                    }}
                    onError={() => setToken("")}
                  />
                </div>
              ) : null}

              <form className={styles.form} onSubmit={onSubmit}>
                {voiceBusy ? (
                  <>
                    <button
                      ref={discardButtonRef}
                      type="button"
                      className={styles.discard}
                      aria-label={discardLabel}
                      title={discardLabel}
                      onClick={cancelDictation}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
                      </svg>
                    </button>
                    <div className={styles.voiceStatus}>
                      {recording ? (
                        <span className={styles.recordingDot} aria-hidden="true" />
                      ) : null}
                      <span role="status">
                        {recording
                          ? "Recording"
                          : voicePhase === "requesting"
                            ? "Waiting for microphone…"
                            : "Turning speech into text…"}
                      </span>
                      {recording ? (
                        <span className={styles.voiceTimer} aria-hidden="true">
                          0:{String(dictation.seconds).padStart(2, "0")}
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <label htmlFor="clara-message" className={styles.srOnly}>
                      Your message to Clara
                    </label>
                    <textarea
                      ref={inputRef}
                      id="clara-message"
                      className={styles.input}
                      rows={2}
                      maxLength={CHAT_MESSAGE_MAX_CHARS}
                      value={input}
                      placeholder={
                        activeDegraded
                          ? "Chat is paused. Use the links above."
                          : "Type your message…"
                      }
                      disabled={!chatAvailable || Boolean(activeDegraded) || sending}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={onInputKeyDown}
                    />
                  </>
                )}
                {showMic && (!voiceBusy || recording) ? (
                  <button
                    ref={micButtonRef}
                    type="button"
                    className={styles.microphone}
                    data-recording={recording}
                    aria-label={micLabel}
                    title={micLabel}
                    disabled={
                      !recording && (sending || Boolean(activeDegraded) || (!botVerified && !token))
                    }
                    onClick={() => {
                      if (recording) {
                        dictation.stop();
                      } else {
                        voiceFocus.current = "mic";
                        stopReadAloud();
                        void dictation.record(transcribe);
                      }
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      {recording ? (
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                      ) : (
                        <g
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        >
                          <rect x="9" y="3" width="6" height="12" rx="3" />
                          <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-3 0h6" />
                        </g>
                      )}
                    </svg>
                  </button>
                ) : null}
                {!voiceBusy ? (
                  <button
                    type="submit"
                    className={styles.send}
                    disabled={!canSend}
                    aria-label="Send message"
                    title="Send message"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M12 19V5m-6 6 6-6 6 6" />
                    </svg>
                  </button>
                ) : null}
              </form>
              <p className={styles.footnote}>
                <span>Clara is an AI assistant. A person can always help.</span>{" "}
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
