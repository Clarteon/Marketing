"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
import { addDaysToDateKey, weekdayForDateKey } from "@/lib/booking/time";
import { readPreferredTimeZone, savePreferredTimeZone } from "@/lib/cookies";
import {
  calendarDays,
  calendarDayNumber,
  calendarMonthKey,
  calendarMonthLabel,
} from "@/lib/booking/calendar";
import { COMMON_TIMEZONES } from "@/lib/booking/timezones";
import { Button } from "./Button";
import { SelectField } from "./SelectField";
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

type AvailabilityState = "loading" | "ready" | "unavailable" | "error";
type BookingStep = "date" | "time" | "details";
type Status =
  | { kind: "idle"; message: "" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function browserTimeZone(): string {
  const saved = readPreferredTimeZone();
  if (saved) return saved;
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

function focusAfterPaint(elementId: string): void {
  const focus = () => document.getElementById(elementId)?.focus();
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(focus);
  } else {
    window.setTimeout(focus, 0);
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
  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function nextAvailableDate(
  startKey: string,
  step: number,
  availableDateKeys: Set<string>,
): string | null {
  let candidate = startKey;
  for (let attempt = 0; attempt < 370; attempt += 1) {
    candidate = addDaysToDateKey(candidate, step);
    if (availableDateKeys.has(candidate)) return candidate;
  }
  return null;
}

function availableDateInWeek(
  dateKey: string,
  edge: "start" | "end",
  availableDateKeys: Set<string>,
): string | null {
  const weekday = (weekdayForDateKey(dateKey) + 6) % 7;
  const monday = addDaysToDateKey(dateKey, -weekday);
  const offsets = edge === "start" ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
  return (
    offsets
      .map((offset) => addDaysToDateKey(monday, offset))
      .find((key) => availableDateKeys.has(key)) ?? null
  );
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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [visibleMonthKey, setVisibleMonthKey] = useState<string | null>(null);
  const [calendarFocusDateKey, setCalendarFocusDateKey] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>("date");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [confirmation, setConfirmation] = useState<ConfirmedBooking | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const configured = Boolean(turnstileSiteKey);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);
  const groups = useMemo(() => groupSlots(slots, timezone), [slots, timezone]);
  const availableGroups = useMemo(
    () => new Map(groups.map((group) => [group.key, group])),
    [groups],
  );
  const availableDateKeys = useMemo(() => new Set(availableGroups.keys()), [availableGroups]);
  const firstGroup = groups[0];
  const selectedGroup = selectedDateKey ? availableGroups.get(selectedDateKey) : undefined;
  const activeDateKey =
    calendarFocusDateKey && availableDateKeys.has(calendarFocusDateKey)
      ? calendarFocusDateKey
      : (selectedGroup ?? firstGroup)?.key;
  const currentMonthKey = visibleMonthKey ?? (firstGroup ? calendarMonthKey(firstGroup.key) : null);
  const stepNumber = step === "date" ? 1 : step === "time" ? 2 : 3;
  const monthKeys = useMemo(
    () => [...new Set(groups.map((group) => calendarMonthKey(group.key)))],
    [groups],
  );
  const currentMonthIndex = currentMonthKey ? monthKeys.indexOf(currentMonthKey) : -1;
  const previousMonthKey = currentMonthIndex > 0 ? monthKeys[currentMonthIndex - 1] : null;
  const nextMonthKey =
    currentMonthIndex >= 0 && currentMonthIndex < monthKeys.length - 1
      ? monthKeys[currentMonthIndex + 1]
      : null;
  const daysInCalendar = currentMonthKey ? calendarDays(currentMonthKey) : [];
  const timezoneOptions = useMemo(() => {
    const values: string[] = [...COMMON_TIMEZONES];
    if (!values.includes(timezone)) values.unshift(timezone);
    return values;
  }, [timezone]);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (step === "details") document.getElementById("booking-name")?.focus();
    if (step === "time") document.getElementById("booking-times-title")?.focus();
  }, [step]);

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
    const slot = slots.find((value) => value.id === slotId);
    if (slot) {
      const dateKey = slotDateKey(slot.start, timezone);
      setSelectedDateKey(dateKey);
      setCalendarFocusDateKey(dateKey);
      setVisibleMonthKey(calendarMonthKey(dateKey));
    }
    setStatus({ kind: "idle", message: "" });
  }

  function selectDate(dateKey: string) {
    if (!availableDateKeys.has(dateKey)) return;
    if (dateKey !== selectedDateKey) {
      requestIdRef.current = null;
      setSelectedSlotId(null);
    }
    setSelectedDateKey(dateKey);
    setCalendarFocusDateKey(dateKey);
    setVisibleMonthKey(calendarMonthKey(dateKey));
    setStep("time");
    setStatus({ kind: "idle", message: "" });
  }

  function showMonth(monthKey: string | null, focusDate = false) {
    if (!monthKey) return;
    const group = groups.find((value) => calendarMonthKey(value.key) === monthKey);
    if (!group) return;
    setVisibleMonthKey(monthKey);
    setCalendarFocusDateKey(group.key);
    if (focusDate) {
      focusAfterPaint(`booking-date-${group.key}`);
    }
  }

  function returnToTimes() {
    resetVerification();
    setStep("time");
    if (selectedSlotId) {
      focusAfterPaint(`booking-slot-${selectedSlotId}`);
    }
  }

  function returnToDates() {
    setStep("date");
    const dateKey = selectedGroup?.key ?? firstGroup?.key;
    if (dateKey) {
      setVisibleMonthKey(calendarMonthKey(dateKey));
      setCalendarFocusDateKey(dateKey);
      focusAfterPaint(`booking-date-${dateKey}`);
    }
  }

  function handleCalendarKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!activeDateKey) return;
    let stepDays: number | null = null;
    if (event.key === "ArrowLeft") stepDays = -1;
    else if (event.key === "ArrowRight") stepDays = 1;
    else if (event.key === "ArrowUp") stepDays = -7;
    else if (event.key === "ArrowDown") stepDays = 7;
    else if (event.key === "Home" || event.key === "End") {
      const targetDateKey = availableDateInWeek(
        activeDateKey,
        event.key === "Home" ? "start" : "end",
        availableDateKeys,
      );
      if (!targetDateKey) return;
      event.preventDefault();
      setCalendarFocusDateKey(targetDateKey);
      setVisibleMonthKey(calendarMonthKey(targetDateKey));
      focusAfterPaint(`booking-date-${targetDateKey}`);
      return;
    } else if (event.key === "PageUp") {
      showMonth(previousMonthKey, true);
      event.preventDefault();
      return;
    } else if (event.key === "PageDown") {
      showMonth(nextMonthKey, true);
      event.preventDefault();
      return;
    }

    if (stepDays === null) return;
    const nextDateKey = nextAvailableDate(activeDateKey, stepDays, availableDateKeys);
    if (!nextDateKey) return;
    event.preventDefault();
    setCalendarFocusDateKey(nextDateKey);
    setVisibleMonthKey(calendarMonthKey(nextDateKey));
    focusAfterPaint(`booking-date-${nextDateKey}`);
  }

  function changeTimezone(value: string) {
    if (value === timezone) return;
    savePreferredTimeZone(value);
    setSelectedTimezone(value);
    setSelectedDateKey(null);
    setCalendarFocusDateKey(null);
    setVisibleMonthKey(null);
    setSelectedSlotId(null);
    setSlots([]);
    setAvailability("loading");
    setStep("date");
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
        setStep("date");
        setConfirmation(payload.booking);
        setConfirmationEmailSent(payload.confirmationEmailSent === true);
        setStatus({ kind: "success", message: "Your discovery call is booked." });
        return;
      }

      resetVerification();

      if (response.status === 409) {
        requestIdRef.current = null;
        setSelectedSlotId(null);
        setSelectedDateKey(null);
        setVisibleMonthKey(null);
        setStep("date");
        setSlots([]);
        setAvailability("loading");
        setRefreshKey((value) => value + 1);
        setStatus({
          kind: "error",
          message: "That time was just taken. Choose a date to see the latest available times.",
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
        setSelectedDateKey(null);
        setVisibleMonthKey(null);
        setStep("date");
        setSlots([]);
        setAvailability("loading");
        setRefreshKey((value) => value + 1);
        setStatus({
          kind: "error",
          message:
            "That time is no longer available. Choose a date to see the latest available times.",
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
      <div className={styles.bookingTimezone}>
        <SelectField
          id="booking-timezone"
          label="Times shown in"
          density="compact"
          value={timezone}
          onValueChange={(value) => {
            if (value !== null) changeTimezone(value);
          }}
          options={timezoneOptions.map((value) => ({ value, label: timeZoneLabel(value) }))}
        />
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
        <div className={styles.bookingFlow}>
          <ol className={styles.bookingProgress} aria-label="Booking progress">
            {(["Date", "Time", "Details"] as const).map((label, index) => (
              <li
                key={label}
                aria-current={stepNumber === index + 1 ? "step" : undefined}
                data-complete={stepNumber > index + 1}
              >
                <span aria-hidden="true">{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          <div className={styles.bookingDateStep} hidden={step !== "date"}>
            <div className={styles.bookingCalendar}>
              <div className={styles.bookingCalendarHeader}>
                <button
                  className={styles.bookingCalendarNav}
                  type="button"
                  aria-label="Previous available month"
                  disabled={!previousMonthKey}
                  onClick={() => showMonth(previousMonthKey)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m15 5-7 7 7 7 2-2-5-5 5-5-2-2Z" />
                  </svg>
                </button>
                <p className={styles.bookingCalendarMonth} aria-live="polite">
                  {currentMonthKey ? calendarMonthLabel(currentMonthKey) : "Available dates"}
                </p>
                <button
                  className={styles.bookingCalendarNav}
                  type="button"
                  aria-label="Next available month"
                  disabled={!nextMonthKey}
                  onClick={() => showMonth(nextMonthKey)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m9 5-2 2 5 5-5 5 2 2 7-7-7-7Z" />
                  </svg>
                </button>
              </div>

              <div
                className={styles.bookingCalendarGrid}
                role="grid"
                aria-label={
                  currentMonthKey
                    ? `Available dates for ${calendarMonthLabel(currentMonthKey)}`
                    : "Available dates"
                }
                onKeyDown={handleCalendarKeyDown}
              >
                <div className={styles.bookingCalendarRow} role="row">
                  {[
                    ["Monday", "Mon"],
                    ["Tuesday", "Tue"],
                    ["Wednesday", "Wed"],
                    ["Thursday", "Thu"],
                    ["Friday", "Fri"],
                    ["Saturday", "Sat"],
                    ["Sunday", "Sun"],
                  ].map(([label, shortLabel]) => (
                    <div
                      className={styles.bookingCalendarWeekday}
                      key={label}
                      role="columnheader"
                      aria-label={label}
                    >
                      {shortLabel}
                    </div>
                  ))}
                </div>
                {Array.from({ length: Math.ceil(daysInCalendar.length / 7) }, (_, rowIndex) => (
                  <div className={styles.bookingCalendarRow} role="row" key={rowIndex}>
                    {daysInCalendar
                      .slice(rowIndex * 7, rowIndex * 7 + 7)
                      .map((dateKey, dayIndex) => {
                        if (!dateKey) {
                          return (
                            <div
                              className={styles.bookingCalendarBlank}
                              role="gridcell"
                              key={`blank-${rowIndex}-${dayIndex}`}
                            />
                          );
                        }

                        const group = availableGroups.get(dateKey);
                        const isSelected = selectedGroup?.key === dateKey;
                        const isActive = activeDateKey === dateKey;
                        const dayLabel =
                          group?.label ??
                          new Intl.DateTimeFormat("en", {
                            timeZone: "UTC",
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }).format(new Date(`${dateKey}T12:00:00Z`));

                        return (
                          <div
                            className={styles.bookingCalendarCell}
                            key={dateKey}
                            role="gridcell"
                            aria-selected={isSelected}
                          >
                            <button
                              id={`booking-date-${dateKey}`}
                              className={[
                                styles.bookingCalendarDay,
                                group ? styles.bookingCalendarDayAvailable : "",
                                isSelected ? styles.bookingCalendarDaySelected : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              type="button"
                              disabled={!group}
                              tabIndex={group && isActive ? 0 : -1}
                              aria-label={
                                group ? `${dayLabel}, available` : `${dayLabel}, no available times`
                              }
                              onFocus={() => {
                                if (group) setCalendarFocusDateKey(dateKey);
                              }}
                              onClick={() => selectDate(dateKey)}
                            >
                              {calendarDayNumber(dateKey)}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
              <p className={styles.bookingCalendarNote}>
                Choose a highlighted date to see available times.
              </p>
            </div>
          </div>

          <div className={styles.bookingTimeStep} hidden={step !== "time"}>
            <div className={styles.bookingTimes}>
              <div className={styles.bookingTimesHeader}>
                <div>
                  <p id="booking-times-title" tabIndex={-1} className={styles.bookingSlotDayLabel}>
                    {selectedGroup?.label ?? "Choose a date"}
                  </p>
                  <p className={styles.bookingTimesCount}>
                    {selectedGroup?.slots.length ?? 0} available times
                  </p>
                </div>
                <Button type="button" variant="text" onClick={returnToDates}>
                  Change date
                </Button>
              </div>
              {selectedGroup ? (
                <div
                  className={styles.bookingSlotGrid}
                  role="group"
                  aria-label={`Available times on ${selectedGroup.label}`}
                >
                  {selectedGroup.slots.map((slot) => (
                    <button
                      id={`booking-slot-${slot.id}`}
                      className={styles.bookingSlot}
                      key={slot.id}
                      type="button"
                      aria-pressed={selectedSlotId === slot.id}
                      aria-label={`${selectedGroup.label} at ${formatSlotTime(slot.start, timezone)}`}
                      onClick={() => selectSlot(slot.id)}
                    >
                      {formatSlotTime(slot.start, timezone)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.bookingStepActions}>
              <p className={styles.bookingStepHint}>
                {selectedSlot
                  ? formatSlotDateTime(selectedSlot.start, timezone)
                  : "Choose a time to continue."}
              </p>
              <Button type="button" disabled={!selectedSlot} onClick={() => setStep("details")}>
                Continue
              </Button>
            </div>
          </div>

          <div className={styles.bookingDetailsStep} hidden={step !== "details" || !selectedSlot}>
            {selectedSlot ? (
              <div className={styles.bookingSelected}>
                <p>
                  <strong>{formatSlotDateTime(selectedSlot.start, timezone)}</strong>
                  <span> · 30 min on Google Meet</span>
                </p>
                <Button type="button" variant="text" onClick={returnToTimes}>
                  Change time
                </Button>
              </div>
            ) : null}

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

              <details className={styles.bookingOptionalNote}>
                <summary>
                  Share a little context <span>(optional)</span>
                </summary>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="booking-notes">
                    What would you like to talk about?
                  </label>
                  <textarea
                    className={styles.textarea}
                    id="booking-notes"
                    name="notes"
                    maxLength={1_000}
                  />
                </div>
              </details>

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

              {step === "details" ? (
                <TurnstileWidget
                  key={resetKey}
                  siteKey={turnstileSiteKey!}
                  action={BOOKING_TURNSTILE_ACTION}
                  onToken={(value) => setToken(value)}
                  onError={() => {
                    setToken("");
                    setStatus({
                      kind: "error",
                      message: "Verification expired or could not load. Please try again.",
                    });
                  }}
                />
              ) : null}

              <div className={styles.formActions}>
                <Button type="submit" disabled={submitting || !selectedSlot || !token}>
                  {submitting ? "Booking…" : "Book discovery call"}
                </Button>
                <p className={styles.formNote} id="booking-form-note">
                  A Google Meet link will be sent after your booking is confirmed.
                </p>
              </div>

              {status.kind === "error" ? (
                <p className={styles.formError} role="alert">
                  {status.message}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      {status.kind === "error" && !selectedSlot ? (
        <p className={styles.formError} role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
