"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReviewQuestion } from "@/lib/knowledge/types";
import styles from "@/app/admin/admin.module.css";

interface ReviewQueueProps {
  questions: ReviewQuestion[];
}

interface ReviewItemProps {
  question: ReviewQuestion;
  onDone: (id: string, message: string) => void;
}

const sourceOptions = [
  { value: "/contact#message", label: "Contact — message section" },
  { value: "/contact#book", label: "Contact — booking section" },
  { value: "/solutions", label: "Solutions" },
  { value: "/how-we-work", label: "How we work" },
  { value: "/our-work", label: "Our work" },
  { value: "/insights", label: "Insights" },
  { value: "/about", label: "About" },
  { value: "/privacy", label: "Privacy" },
];

function askedLabel(count: number): string {
  return count === 1 ? "Asked once" : `Asked ${count} times`;
}

function dateLabel(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ReviewItem({ question, onDone }: ReviewItemProps) {
  const [title, setTitle] = useState(question.question.slice(0, 120));
  const [answer, setAnswer] = useState("");
  const [tags, setTags] = useState("");
  const [synonyms, setSynonyms] = useState("");
  const [sourceUrl, setSourceUrl] = useState("/contact#message");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function submit(action: "approve" | "reject") {
    if (busy) return;
    if (action === "approve" && title.trim().length < 3) {
      setError("Write an answer title of at least 3 characters.");
      return;
    }
    if (action === "approve" && answer.trim().length < 10) {
      setError("Write at least 10 characters before approving.");
      return;
    }
    if (
      action === "reject" &&
      !window.confirm("Reject this question? It will leave the review queue.")
    ) {
      return;
    }

    setBusy(action);
    setError("");

    try {
      const body =
        action === "approve"
          ? {
              action,
              questionId: question.id,
              title,
              answer,
              tags,
              synonyms,
              sourceUrl,
            }
          : { action, questionId: question.id };

      const response = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        reindexed?: boolean;
      };

      if (!response.ok) {
        if (response.status === 401) {
          setError("Your session expired. Sign in again.");
        } else if (response.status === 409) {
          setError("This question was already reviewed.");
          onDone(question.id, "The question was already reviewed.");
        } else if (response.status === 503) {
          setError("The knowledge store is unavailable. Try again later.");
        } else {
          setError("Could not save this review. Try again.");
        }
        return;
      }

      if (action === "reject") {
        onDone(question.id, "Question rejected.");
        return;
      }

      onDone(
        question.id,
        payload.reindexed === false
          ? "Answer published. The search index will refresh on the next sync."
          : "Answer published and the search index was refreshed.",
      );
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <p className={styles.questionText}>{question.question}</p>
        <p className={styles.meta}>
          {askedLabel(question.askCount)} · Last seen {dateLabel(question.lastSeenAt)}
        </p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`title-${question.id}`}>
          Answer title
        </label>
        <input
          className={styles.input}
          id={`title-${question.id}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          disabled={busy !== null}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`answer-${question.id}`}>
          Published answer
        </label>
        <textarea
          className={styles.textarea}
          id={`answer-${question.id}`}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={6}
          maxLength={2_000}
          aria-describedby={`answer-hint-${question.id}`}
          disabled={busy !== null}
        />
        <p className={styles.hint} id={`answer-hint-${question.id}`}>
          Plain text. Clara treats this as knowledge, so keep it factual and brief.
        </p>
      </div>

      <div className={styles.twoColumns}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`tags-${question.id}`}>
            Tags (optional)
          </label>
          <input
            className={styles.input}
            id={`tags-${question.id}`}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="automation, invoices"
            maxLength={400}
            disabled={busy !== null}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`synonyms-${question.id}`}>
            Synonyms (optional)
          </label>
          <input
            className={styles.input}
            id={`synonyms-${question.id}`}
            value={synonyms}
            onChange={(event) => setSynonyms(event.target.value)}
            placeholder="repetitive work, manual process"
            maxLength={400}
            disabled={busy !== null}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`source-${question.id}`}>
          Link the answer to
        </label>
        <select
          className={styles.select}
          id={`source-${question.id}`}
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          disabled={busy !== null}
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => submit("approve")}
          disabled={busy !== null}
        >
          {busy === "approve" ? "Publishing…" : "Approve and publish"}
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          onClick={() => submit("reject")}
          disabled={busy !== null}
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </article>
  );
}

export function ReviewQueue({ questions }: ReviewQueueProps) {
  const router = useRouter();
  const [items, setItems] = useState(questions);
  const [message, setMessage] = useState("");

  function onDone(id: string, nextMessage: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage(nextMessage);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nothing is waiting for review.</p>
        <p className={styles.hint}>
          Questions Clara cannot answer will appear here after a visitor asks them.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.queue}>
      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}
      {items.map((question) => (
        <ReviewItem key={question.id} question={question} onDone={onDone} />
      ))}
    </div>
  );
}
