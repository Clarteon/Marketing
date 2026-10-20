"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  LEAD_FORM_MIN_SUBMIT_MS,
  TURNSTILE_ACTION,
  teamSizeLabels,
  teamSizes,
} from "@/lib/leads/constants";
import { Button } from "./Button";
import { TurnstileWidget } from "./TurnstileWidget";
import styles from "./ui.module.css";

interface ProjectBriefFormProps {
  turnstileSiteKey?: string;
}

type FormStatus =
  | { kind: "idle"; message: "" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ProjectBriefForm({ turnstileSiteKey }: ProjectBriefFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const startedAtRef = useRef(0);
  const requestIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [status, setStatus] = useState<FormStatus>({ kind: "idle", message: "" });

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const configured = Boolean(turnstileSiteKey);

  function resetVerification() {
    setToken("");
    setResetKey((value) => value + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!configured) {
      setStatus({
        kind: "error",
        message: "The form is not available yet. Please try again later.",
      });
      return;
    }

    if (!token) {
      setStatus({ kind: "error", message: "Please complete the verification above." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    if (formData.get("consent") !== "on") {
      setStatus({ kind: "error", message: "Please agree to the privacy notice before sending." });
      return;
    }

    requestIdRef.current ??= crypto.randomUUID();
    startedAtRef.current ||= Date.now();
    setSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < LEAD_FORM_MIN_SUBMIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, LEAD_FORM_MIN_SUBMIT_MS - elapsed));
    }

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          company: formData.get("company") || undefined,
          need: formData.get("need"),
          teamSize: formData.get("teamSize") || undefined,
          consent: true,
          turnstileToken: token,
          requestId: requestIdRef.current,
          startedAt: startedAtRef.current,
          website: formData.get("website") ?? "",
        }),
      });

      if (response.ok) {
        const savedMessage =
          "Thanks. Your project brief is saved. A person on the Clarteon team will reply to the email you gave.";
        formRef.current?.reset();
        requestIdRef.current = null;
        startedAtRef.current = Date.now();
        resetVerification();
        setStatus({ kind: "success", message: savedMessage });
        return;
      }

      resetVerification();

      if (response.status === 429) {
        setStatus({
          kind: "error",
          message: "Too many attempts. Please wait a minute and try again.",
        });
      } else if (response.status === 403) {
        setStatus({
          kind: "error",
          message: "The verification did not pass. Please try again.",
        });
      } else if (response.status === 400) {
        setStatus({ kind: "error", message: "Please check the fields and try again." });
      } else {
        setStatus({
          kind: "error",
          message: "The form is not available right now. Please try again in a moment.",
        });
      }
    } catch {
      resetVerification();
      setStatus({
        kind: "error",
        message: "We could not reach the server. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="brief-name">
            Name
          </label>
          <input
            className={styles.input}
            id="brief-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="brief-email">
            Email
          </label>
          <input
            className={styles.input}
            id="brief-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="brief-company">
            Company <span className={styles.hint}>(optional)</span>
          </label>
          <input
            className={styles.input}
            id="brief-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={200}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="brief-team-size">
            Team size <span className={styles.hint}>(optional)</span>
          </label>
          <select className={styles.select} id="brief-team-size" name="teamSize" defaultValue="">
            <option value="">Prefer not to say</option>
            {teamSizes.map((size) => (
              <option key={size} value={size}>
                {teamSizeLabels[size]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="brief-need">
          What is slowing you down?
        </label>
        <p className={styles.hint} id="brief-need-hint">
          A sentence or two is enough. Include what you have tried if it helps.
        </p>
        <textarea
          className={styles.textarea}
          id="brief-need"
          name="need"
          aria-describedby="brief-need-hint"
          minLength={10}
          maxLength={2_000}
          required
        />
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="brief-website">Website</label>
        <input id="brief-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.checkboxField}>
        <input
          className={styles.checkbox}
          id="brief-consent"
          name="consent"
          type="checkbox"
          required
        />
        <label className={styles.checkboxLabel} htmlFor="brief-consent">
          I agree that Clarteon may use these details to reply. See the{" "}
          <Link href="/privacy">Privacy page</Link>.
        </label>
      </div>

      {configured ? (
        <TurnstileWidget
          key={resetKey}
          siteKey={turnstileSiteKey!}
          action={TURNSTILE_ACTION}
          onToken={(value) => {
            setToken(value);
          }}
          onError={() => {
            setToken("");
            setStatus({
              kind: "error",
              message: "Verification expired or could not load. Please try again.",
            });
          }}
        />
      ) : (
        <p className={styles.formNote}>
          The form is not configured in this environment yet. The fields show what we will ask for.
        </p>
      )}

      <div className={styles.formActions}>
        <Button
          type="submit"
          disabled={!configured || submitting || !token}
          aria-describedby="brief-form-note"
        >
          {submitting ? "Sending…" : "Send project brief"}
        </Button>
        <p className={styles.formNote} id="brief-form-note">
          Protected by Cloudflare Turnstile. We save your brief before sending email.
        </p>
      </div>

      {status.kind === "success" ? (
        <p className={styles.formStatus} role="status">
          {status.message}
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p className={styles.formError} role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
