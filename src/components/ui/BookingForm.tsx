"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  BOOKING_DEFAULT_TIMEZONE,
  BOOKING_FORM_MIN_SUBMIT_MS,
  BOOKING_TURNSTILE_ACTION,
} from "@/lib/booking/constants";
import {
  formatSlotDate,
  formatSlotDateTime,
  formatSlotTime,
  slotDateKey,
  timeZoneLabel,
} from "@/lib/booking/format";
import { Button } from "./Button";
import { TurnstileWidget } from "./TurnstileWidget";
import styles from "./ui.module.css";

interface BookingFormProps {
  turnstileSiteKey?: string;
}

interface Slot {
  id: string;
  start: string;
  end: string;
}

interface AvailabilityResponse {
  ok?: boolean;
  timezone?: string;
  slots?: Slot[];
  error?: string;
}

interface ConfirmedBooking {
  start: string;
  end: string;
  timezone: string;
  meetLink: string | null;
  calendarLink: string | null;
}

interface BookingResponse {
  ok?: boolean;
  booking?: ConfirmedBooking;
  confirmationEmailSent?: boolean;
  error?: string;
}

interface SlotGroup {
  key: string;
  label: string;
  slots: Slot[];
}

const COMMON_TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;

type AvailabilityState = "loading" | "ready" | "unavailable" | "error";
type Status =
  | { kind: "idle"; message: "" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function browserTimeZone(): string {
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return value && value.length <= 100 ? value : BOOKING_DEFAULT_TIMEZONE;
  } catch {
    return BOOKING_DEFAULT_TIMEZONE;
  }
}

const subscribeToTimeZone = () => () => {};
const serverTimeZone = () => BOOKING_DEFAULT_TIMEZONE;

async function waitForMinimumSubmit(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < BOOKING_FORM_MIN_SUBMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, BOOKING_FORM_MIN_SUBMIT_MS - elapsed));
  }
}

function groupSlots(slots: Slot[], timezone: string): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const slot of slots) {
    const key = slotDateKey(slot.start, timezone);
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    groups.set(key, {
      key,
      label: formatSlotDate(slot.start, timezone),
      slots: [slot],
    });
  }
  return [...groups.values()];
}

export function BookingForm({ turnstileSiteKey }: BookingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const startedAtRef = useRef(0);
  const requestIdRef = useRef<string | null>(null);
  const detectedTimezone = useSyncExternalStore(
    subscribeToTimeZone,
    browserTimeZone,
    serverTimeZone,
  );
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(null);
  const timezone = selectedTimezone ?? detectedTimezone;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [confirmation, setConfirmation] = useState<ConfirmedBooking | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const configured = Boolean(turnstileSiteKey);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);
  const groups = useMemo(() => groupSlots(slots, timezone), [slots, timezone]);
  const timezoneOptions = useMemo(() => {
    const values: string[] = [...COMMON_TIMEZONES];
    if (!values.includes(timezone)) values.unshift(timezone);
    return values;
  }, [timezone]);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!configured) return;

    const controller = new AbortController();
    let closed = false;

    fetch(`/api/booking/availability?timezone=${encodeURIComponent(timezone)}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as AvailabilityResponse | null;
        if (closed) return;
        if (!response.ok || !payload?.ok || !Array.isArray(payload.slots)) {
          setSlots([]);
          setAvailability("unavailable");
          return;
        }
        setSlots(payload.slots);
        setAvailability("ready");
      })
      .catch((error: unknown) => {
        if (closed) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSlots([]);
        setAvailability("error");
      });

    return () => {
      closed = true;
      controller.abort();
    };
  }, [configured, timezone, refreshKey]);

  function resetVerification() {
    setToken("");
    setResetKey((value) => value + 1);
  }

  function selectSlot(slotId: string) {
    if (slotId !== selectedSlotId) requestIdRef.current = null;
    setSelectedSlotId(slotId);
    setStatus({ kind: "idle", message: "" });
  }

  function changeTimezone(value: string) {
    // Same zone means no refetch, so clearing the slots here would leave the picker loading forever.
    if (value === timezone) return;
    setSelectedTimezone(value);
    setSelectedSlotId(null);
    setSlots([]);
    setAvailability("loading");
    setStatus({ kind: "idle", message: "" });
    resetVerification();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selectedSlot) return;

    if (!configured) {
      setStatus({
        kind: "error",
        message: "Booking is not available yet. Please send a project brief instead.",
      });
      return;
    }

    if (!token) {
      setStatus({ kind: "error", message: "Please complete the verification above." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    if (formData.get("consent") !== "on") {
      setStatus({ kind: "error", message: "Please agree to the privacy notice before booking." });
      return;
    }

    requestIdRef.current ??= crypto.randomUUID();
    startedAtRef.current ||= Date.now();
    setSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    await waitForMinimumSubmit(startedAtRef.current);

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(35_000),
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          notes: formData.get("notes") || undefined,
          timezone,
          slotId: selectedSlot.id,
          consent: true,
          turnstileToken: token,
          requestId: requestIdRef.current,
          startedAt: startedAtRef.current,
          website: formData.get("website") ?? "",
        }),
      });

      const payload = (await response.json().catch(() => null)) as BookingResponse | null;

      if (response.ok && payload?.ok && payload.booking) {
        formRef.current?.reset();
        requestIdRef.current = null;
        resetVerification();
        setSelectedSlotId(null);
        setConfirmation(payload.booking);
        setConfirmationEmailSent(payload.confirmationEmailSent === true);
        setStatus({ kind: "success", message: "Your discovery call is booked." });
        return;
      }

      resetVerification();

      if (response.status === 409) {
        requestIdRef.current = null;
        setSelectedSlotId(null);
        setSlots([]);
        setAvailability("loading");
        setRefreshKey((value) => value + 1);
        setStatus({
          kind: "error",
          message: "That time was just taken. Choose another time below.",
        });
      } else if (response.status === 429) {
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
        requestIdRef.current = null;
        setSelectedSlotId(null);
        setSlots([]);
        setAvailability("loading");
        setRefreshKey((value) => value + 1);
        setStatus({
          kind: "error",
          message: "That time is no longer available. Choose another time below.",
        });
      } else {
        setStatus({
          kind: "error",
          message:
            "We could not confirm the booking. Please try again. If it keeps failing, send a project brief.",
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

  if (confirmation) {
    return (
      <div className={styles.bookingFormPanel}>
        <div className={styles.bookingConfirmation} role="status">
          <p className={styles.eyebrow}>Booked</p>
          <h3 className={styles.bookingFormTitle}>Your discovery call is confirmed.</h3>
          <p className={styles.bookingConfirmationTime}>
            {formatSlotDateTime(confirmation.start, confirmation.timezone)}
          </p>
          {confirmation.meetLink ? (
            <Button href={confirmation.meetLink} target="_blank" rel="noreferrer" size="large">
              Join with Google Meet
            </Button>
          ) : confirmation.calendarLink ? (
            <Button
              href={confirmation.calendarLink}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
            >
              Open the calendar event
            </Button>
          ) : null}
          <p className={styles.formNote}>
            {confirmationEmailSent
              ? "A confirmation email with the Google Meet link is on its way."
              : "The confirmation email could not be sent. Your booking is still confirmed. If you need the invitation, email info@clarteon.tech."}
          </p>
          <p className={styles.formNote}>
            Need a different time? Email <a href="mailto:info@clarteon.tech">info@clarteon.tech</a>.
          </p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className={styles.bookingFormPanel}>
        <div className={styles.bookingFallback}>
          <p className={styles.bookingFormTitle}>Booking is not available yet.</p>
          <p className={styles.formNote}>
            Send a project brief and a person on the Clarteon team will find a time with you.
          </p>
          <Button href="#brief" variant="primary">
            Send a project brief
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookingFormPanel}>
      <div className={styles.bookingFormHeader}>
        <p className={styles.eyebrow}>Discovery call</p>
        <h3 className={styles.bookingFormTitle}>Choose a time that works for you.</h3>
        <p className={styles.formNote}>
          30 minutes on Google Meet. Times are shown in your timezone.
        </p>
      </div>

      <div className={styles.bookingTimezone}>
        <label className={styles.label} htmlFor="booking-timezone">
          Times shown in
        </label>
        <select
          className={styles.select}
          id="booking-timezone"
          value={timezone}
          onChange={(event) => changeTimezone(event.target.value)}
        >
          {timezoneOptions.map((value) => (
            <option key={value} value={value}>
              {timeZoneLabel(value)}
            </option>
          ))}
        </select>
      </div>

      {availability === "loading" ? (
        <p className={styles.formNote} role="status">
          Loading available times…
        </p>
      ) : null}

      {availability === "unavailable" || availability === "error" ? (
        <div className={styles.bookingFallback}>
          <p>
            Booking is not available right now. Send a project brief and we will find a time with
            you.
          </p>
          <Button href="#brief" variant="primary">
            Send a project brief
          </Button>
        </div>
      ) : null}

      {availability === "ready" && groups.length === 0 ? (
        <div className={styles.bookingFallback}>
          <p>No open times in the next 30 days. Send a project brief and we will find a time.</p>
          <Button href="#brief" variant="primary">
            Send a project brief
          </Button>
        </div>
      ) : null}

      {availability === "ready" && groups.length > 0 ? (
        <div className={styles.bookingSlotGroups}>
          {groups.map((group) => {
            const labelId = `booking-day-${group.key}`;
            return (
              <div className={styles.bookingSlotDay} key={group.key}>
                <p className={styles.bookingSlotDayLabel} id={labelId}>
                  {group.label}
                </p>
                <div className={styles.bookingSlotGrid} role="group" aria-labelledby={labelId}>
                  {group.slots.map((slot) => (
                    <button
                      className={styles.bookingSlot}
                      key={slot.id}
                      type="button"
                      aria-pressed={selectedSlotId === slot.id}
                      aria-label={`${group.label} at ${formatSlotTime(slot.start, timezone)}`}
                      onClick={() => selectSlot(slot.id)}
                    >
                      {formatSlotTime(slot.start, timezone)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedSlot ? (
        <div className={styles.bookingSelected}>
          <p>
            Selected: <strong>{formatSlotDateTime(selectedSlot.start, timezone)}</strong>
          </p>
          <Button type="button" variant="text" onClick={() => setSelectedSlotId(null)}>
            Change time
          </Button>
        </div>
      ) : null}

      {selectedSlot ? (
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="booking-name">
                Name
              </label>
              <input
                className={styles.input}
                id="booking-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={120}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="booking-email">
                Email
              </label>
              <input
                className={styles.input}
                id="booking-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-notes">
              What would you like to talk about? <span className={styles.hint}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              id="booking-notes"
              name="notes"
              maxLength={1_000}
            />
          </div>

          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor="booking-website">Website</label>
            <input
              id="booking-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className={styles.checkboxField}>
            <input
              className={styles.checkbox}
              id="booking-consent"
              name="consent"
              type="checkbox"
              required
            />
            <label className={styles.checkboxLabel} htmlFor="booking-consent">
              I agree that Clarteon may use these details to arrange the call. See the{" "}
              <Link href="/privacy">Privacy page</Link>.
            </label>
          </div>

          <TurnstileWidget
            key={resetKey}
            siteKey={turnstileSiteKey!}
            action={BOOKING_TURNSTILE_ACTION}
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

          <div className={styles.formActions}>
            <Button type="submit" disabled={submitting || !token}>
              {submitting ? "Booking…" : "Book discovery call"}
            </Button>
            <p className={styles.formNote} id="booking-form-note">
              You will get a Google Meet link by email. Protected by Cloudflare Turnstile.
            </p>
          </div>

          {status.kind === "error" ? (
            <p className={styles.formError} role="alert">
              {status.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {status.kind === "error" && !selectedSlot ? (
        <p className={styles.formError} role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
