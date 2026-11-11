"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/ToastProvider";
import { COMMON_TIMEZONES } from "@/lib/booking/timezones";
import styles from "@/app/admin/admin.module.css";

interface BookingEditFormProps {
  booking: {
    requestId: string;
    name: string;
    email: string;
    timezone: string;
    notes: string | null;
  };
}

function errorMessage(status: number): string {
  if (status === 400) return "Some values are not valid. Check the fields and try again.";
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 404) return "This booking no longer exists.";
  if (status === 429) return "Too many edits in a row. Wait a moment and try again.";
  if (status === 503) return "Booking storage is unavailable. Try again later.";
  return "Could not save the change. Try again.";
}

export function BookingEditForm({ booking }: BookingEditFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(booking.name);
  const [email, setEmail] = useState(booking.email);
  const [timezone, setTimezone] = useState(booking.timezone);
  const [notes, setNotes] = useState(booking.notes ?? "");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Grow the notes box to fit the whole guest note, so nothing is hidden in a scroll area.
  useEffect(() => {
    const field = notesRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [notes]);

  const savedNotes = booking.notes ?? "";
  const dirty =
    name !== booking.name ||
    email !== booking.email ||
    timezone !== booking.timezone ||
    notes !== savedNotes;

  const timezoneOptions = [...new Set([booking.timezone, ...COMMON_TIMEZONES])].map((value) => ({
    value,
    label: value,
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;

    setBusy(true);
    setError("");
    setSaved(false);

    try {
      const patch: Record<string, unknown> = {};
      if (name !== booking.name) patch.name = name;
      if (email !== booking.email) patch.email = email;
      if (timezone !== booking.timezone) patch.timezone = timezone;
      if (notes !== savedNotes) patch.notes = notes.trim() === "" ? null : notes.trim();

      const response = await fetch(`/api/admin/bookings/${booking.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };

      if (!response.ok || !payload.ok) {
        setError(errorMessage(response.status));
        return;
      }

      setSaved(true);
      toast.addToast({ kind: "success", message: "Booking details saved." });
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.twoColumns}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="booking-guest-name">
            Guest name
          </label>
          <input
            className={styles.input}
            id="booking-guest-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            maxLength={120}
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="booking-guest-email">
            Guest email
          </label>
          <input
            className={styles.input}
            id="booking-guest-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSaved(false);
            }}
            maxLength={254}
            disabled={busy}
          />
        </div>
      </div>

      <SelectField
        id="booking-guest-timezone"
        label="Guest timezone"
        options={timezoneOptions}
        value={timezone}
        disabled={busy}
        onValueChange={(value) => {
          if (value) {
            setTimezone(value);
            setSaved(false);
          }
        }}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="booking-guest-notes">
          Notes from the guest
        </label>
        <textarea
          className={styles.textarea}
          id="booking-guest-notes"
          ref={notesRef}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setSaved(false);
          }}
          rows={4}
          maxLength={1_000}
          aria-describedby="booking-guest-notes-hint"
          disabled={busy}
        />
        <p className={styles.hint} id="booking-guest-notes-hint">
          What the visitor wrote when they booked. Leave empty to clear it.
        </p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p className={styles.success} role="status">
          Saved. The table now shows the updated details.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.primaryButton} type="submit" disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
