"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "./Button";
import styles from "./ui.module.css";

export function ProjectBriefForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
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
            required
          />
        </div>
      </div>

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
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="brief-problem">
          What is slowing you down?
        </label>
        <p className={styles.hint} id="brief-problem-hint">
          A sentence or two is enough. Include what you have tried if it helps.
        </p>
        <textarea
          className={styles.textarea}
          id="brief-problem"
          name="problem"
          aria-describedby="brief-problem-hint"
          required
        />
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

      <div className={styles.formActions}>
        <Button type="submit" aria-describedby="brief-form-note">
          Send project brief
        </Button>
        <p className={styles.formNote} id="brief-form-note">
          Preview build: this form does not send yet.
        </p>
      </div>

      {submitted ? (
        <p className={styles.formStatus} role="status">
          This preview does not send the form yet. Nothing was sent.
        </p>
      ) : null}
    </form>
  );
}
