"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import uiStyles from "@/components/ui/ui.module.css";
import {
  calendarDays,
  calendarDayNumber,
  calendarMonthKey,
  calendarMonthLabel,
} from "@/lib/booking/calendar";
import {
  formatSlotDate,
  formatSlotDateTime,
  formatSlotTime,
  slotDateKey,
} from "@/lib/booking/format";
import adminStyles from "@/app/admin/admin.module.css";

interface Slot {
  id: string;
  start: string;
  end: string;
}

interface SlotGroup {
  key: string;
  label: string;
  slots: Slot[];
}

type AvailabilityState = "loading" | "ready" | "unavailable" | "error";

interface RescheduleCalendarProps {
  requestId: string;
  timezone: string;
  currentSlotStart: string;
}

function groupByDate(slots: Slot[], tz: string): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const slot of slots) {
    const key = slotDateKey(slot.start, tz);
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    groups.set(key, { key, label: formatSlotDate(slot.start, tz), slots: [slot] });
  }
  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function editError(status: number): string {
  if (status === 400) return "That time is no longer valid. Pick another slot.";
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 404) return "This booking no longer exists.";
  if (status === 429) return "Too many changes in a row. Wait a moment and try again.";
  if (status === 503) return "The calendar or booking store is unavailable. Try again later.";
  return "Could not move the booking. Try again.";
}

export function RescheduleCalendar({
  requestId,
  timezone,
  currentSlotStart,
}: RescheduleCalendarProps) {
  const router = useRouter();
  const toast = useToast();

  const [status, setStatus] = useState<AvailabilityState>("loading");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibleMonthKey, setVisibleMonthKey] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(
          `/api/booking/availability?timezone=${encodeURIComponent(timezone)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          slots?: Slot[];
        };
        if (!response.ok || !payload.ok) {
          setStatus("error");
          return;
        }

        const next = payload.slots ?? [];
        setSlots(next);
        setStatus("ready");
        if (next.length > 0) {
          const firstKey = slotDateKey(next[0].start, timezone);
          setVisibleMonthKey((previous) => previous ?? calendarMonthKey(firstKey));
        }
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [timezone, reloadKey]);

  const groups = useMemo(() => groupByDate(slots, timezone), [slots, timezone]);
  const monthKeys = useMemo(
    () => [...new Set(groups.map((group) => calendarMonthKey(group.key)))],
    [groups],
  );

  const currentMonthKey = visibleMonthKey ?? (groups[0] ? calendarMonthKey(groups[0].key) : null);
  const monthIndex = currentMonthKey ? monthKeys.indexOf(currentMonthKey) : -1;
  const previousMonthKey = monthIndex > 0 ? monthKeys[monthIndex - 1] : null;
  const nextMonthKey =
    monthIndex >= 0 && monthIndex < monthKeys.length - 1 ? monthKeys[monthIndex + 1] : null;

  const daysInCalendar = currentMonthKey ? calendarDays(currentMonthKey) : [];
  const availableDateKeys = useMemo(() => new Set(groups.map((group) => group.key)), [groups]);
  const selectedGroup = groups.find((group) => group.key === selectedDateKey) ?? null;
  const selectedSlot = selectedGroup?.slots.find((slot) => slot.id === selectedSlotId) ?? null;

  function reload(message = "") {
    setError(message);
    setStatus("loading");
    setReloadKey((value) => value + 1);
  }

  async function reschedule() {
    if (!selectedSlotId || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/bookings/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlotId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };

      if (!response.ok || !payload.ok) {
        if (response.status === 409) {
          setSelectedSlotId(null);
          setSelectedDateKey(null);
          reload("That time was just taken. The open times have been refreshed.");
        } else {
          setError(editError(response.status));
        }
        return;
      }

      const message = selectedSlot
        ? `Booking moved to ${formatSlotDateTime(selectedSlot.start, timezone)}.`
        : "Booking moved to the new time.";
      setSelectedSlotId(null);
      setSelectedDateKey(null);
      reload();
      toast.addToast({ kind: "success", message });
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={uiStyles.bookingFlow}>
      <p className={adminStyles.meta}>
        Currently {formatSlotDateTime(currentSlotStart, timezone)}.
      </p>

      {status === "loading" ? (
        <p className={adminStyles.notice} role="status">
          Loading available times…
        </p>
      ) : null}

      {status === "unavailable" || status === "error" ? (
        <div className={adminStyles.notice} role="status">
          <span>Open times could not be loaded right now. Try again in a moment.</span>
          <button className={adminStyles.secondaryButton} type="button" onClick={() => reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && groups.length === 0 ? (
        <p className={adminStyles.notice} role="status">
          No open times in the next 30 days. The booking stays at its current time.
        </p>
      ) : null}

      {status === "ready" && groups.length > 0 ? (
        <>
          <div className={adminStyles.rescheduleGrid}>
            <div className={uiStyles.bookingCalendar}>
              <div className={uiStyles.bookingCalendarHeader}>
                <button
                  className={uiStyles.bookingCalendarNav}
                  type="button"
                  aria-label="Previous available month"
                  disabled={!previousMonthKey}
                  onClick={() => previousMonthKey && setVisibleMonthKey(previousMonthKey)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m15 5-7 7 7 7 2-2-5-5 5-5-2-2Z" />
                  </svg>
                </button>
                <p className={uiStyles.bookingCalendarMonth} aria-live="polite">
                  {currentMonthKey ? calendarMonthLabel(currentMonthKey) : "Available dates"}
                </p>
                <button
                  className={uiStyles.bookingCalendarNav}
                  type="button"
                  aria-label="Next available month"
                  disabled={!nextMonthKey}
                  onClick={() => nextMonthKey && setVisibleMonthKey(nextMonthKey)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m9 5-2 2 5 5-5 5 2 2 7-7-7-7Z" />
                  </svg>
                </button>
              </div>

              <div
                className={uiStyles.bookingCalendarGrid}
                role="grid"
                aria-label={
                  currentMonthKey
                    ? `Available dates for ${calendarMonthLabel(currentMonthKey)}`
                    : "Available dates"
                }
              >
                <div className={uiStyles.bookingCalendarRow} role="row">
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
                      className={uiStyles.bookingCalendarWeekday}
                      key={label}
                      role="columnheader"
                      aria-label={label}
                    >
                      {shortLabel}
                    </div>
                  ))}
                </div>
                {Array.from({ length: Math.ceil(daysInCalendar.length / 7) }, (_, rowIndex) => (
                  <div className={uiStyles.bookingCalendarRow} role="row" key={rowIndex}>
                    {daysInCalendar
                      .slice(rowIndex * 7, rowIndex * 7 + 7)
                      .map((dateKey, dayIndex) => {
                        if (!dateKey) {
                          return (
                            <div
                              className={uiStyles.bookingCalendarBlank}
                              role="gridcell"
                              key={`blank-${rowIndex}-${dayIndex}`}
                            />
                          );
                        }

                        const available = availableDateKeys.has(dateKey);
                        const isSelected = selectedDateKey === dateKey;
                        const dayLabel = available
                          ? (groups.find((group) => group.key === dateKey)?.label ?? dateKey)
                          : new Intl.DateTimeFormat("en", {
                              timeZone: "UTC",
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            }).format(new Date(`${dateKey}T12:00:00Z`));

                        return (
                          <div
                            className={uiStyles.bookingCalendarCell}
                            key={dateKey}
                            role="gridcell"
                            aria-selected={isSelected}
                          >
                            <button
                              className={[
                                uiStyles.bookingCalendarDay,
                                available ? uiStyles.bookingCalendarDayAvailable : "",
                                isSelected ? uiStyles.bookingCalendarDaySelected : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              type="button"
                              disabled={!available}
                              aria-label={
                                available
                                  ? `${dayLabel}, available`
                                  : `${dayLabel}, no available times`
                              }
                              onClick={() => {
                                setSelectedDateKey(dateKey);
                                setSelectedSlotId(null);
                              }}
                            >
                              {calendarDayNumber(dateKey)}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
              <p className={uiStyles.bookingCalendarNote}>
                Choose a highlighted date to see available times.
              </p>
            </div>

            <div className={uiStyles.bookingTimes}>
              <div className={uiStyles.bookingTimesHeader}>
                <div>
                  <p className={uiStyles.bookingSlotDayLabel}>
                    {selectedGroup?.label ?? "Choose a date"}
                  </p>
                  <p className={uiStyles.bookingTimesCount}>
                    {selectedGroup ? `${selectedGroup.slots.length} available times` : " "}
                  </p>
                </div>
              </div>
              {selectedGroup ? (
                <div
                  className={uiStyles.bookingSlotGrid}
                  role="group"
                  aria-label={`Available times on ${selectedGroup.label}`}
                >
                  {selectedGroup.slots.map((slot) => (
                    <button
                      className={uiStyles.bookingSlot}
                      key={slot.id}
                      type="button"
                      aria-pressed={selectedSlotId === slot.id}
                      aria-label={`${selectedGroup.label} at ${formatSlotTime(slot.start, timezone)}`}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      {formatSlotTime(slot.start, timezone)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={adminStyles.hint}>
                  Pick a highlighted date on the calendar to see its open times.
                </p>
              )}
            </div>
          </div>

          <p className={adminStyles.hint}>
            Google sends the guest an updated invite for the new time.
          </p>

          <div className={uiStyles.bookingStepActions}>
            <p className={uiStyles.bookingStepHint}>
              {selectedSlot
                ? `New time: ${formatSlotDateTime(selectedSlot.start, timezone)}`
                : "Choose a date and time to continue."}
            </p>
            <button
              className={adminStyles.primaryButton}
              type="button"
              disabled={!selectedSlot || busy}
              onClick={reschedule}
            >
              {busy ? "Rescheduling…" : "Reschedule"}
            </button>
          </div>

          {error ? (
            <p className={adminStyles.error} role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
