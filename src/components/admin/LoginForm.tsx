"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "@/app/admin/admin.module.css";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 429) {
          setError("Too many attempts. Try again in a few minutes.");
        } else if (body.error === "admin_unavailable") {
          setError("Admin sign-in is not configured yet.");
        } else if (response.status === 401) {
          setError("That password did not work.");
        } else {
          setError("Could not sign in. Try again.");
        }
        return;
      }

      router.replace("/admin/review");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="admin-password">
        Admin password
      </label>
      <input
        className={styles.input}
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        maxLength={200}
        disabled={submitting}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button className={styles.primaryButton} type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
