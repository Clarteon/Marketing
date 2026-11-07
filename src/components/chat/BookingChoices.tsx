"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { timeZoneLabel } from "@/lib/booking/format";
import type { ChatBookingStep } from "@/lib/chat/schema";
import type { ChatBookingOptions } from "@/lib/chat/types";
import { TimezoneChoices } from "./TimezoneChoices";
import styles from "./chat.module.css";

export interface BookingDraft {
  slotId?: string;
  name: string;
  email: string;
}

interface BookingChoicesProps {
  options: ChatBookingOptions;
  draft: BookingDraft;
  disabled: boolean;
  onDraft: (draft: BookingDraft) => void;
  onTimes: (timezone: string, from?: string) => void;
  onReview: (booking: ChatBookingStep, timezone: string) => void;
}

export function BookingChoices({
  options,
  draft,
  disabled,
  onDraft,
  onTimes,
  onReview,
}: BookingChoicesProps) {
  const [changeTimezone, setChangeTimezone] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const slot = options.slots.find((item) => item.id === draft.slotId);
  const { timezone } = options;

  useEffect(() => {
    if (slot) nameInput.current?.focus();
    else card.current?.focus();
  }, [options.offer, slot]);

  return (
    <div
      ref={card}
      className={styles.degraded}
      role="group"
      tabIndex={-1}
      aria-label="Book a discovery call"
    >
      {slot ? (
        <form
          className={styles.bookingDetails}
          onSubmit={(event) => {
            event.preventDefault();
            onReview(
              {
                step: "review",
                slot_id: slot.id,
                name: draft.name,
                email: draft.email,
                offer: options.offer,
              },
              timezone,
            );
          }}
        >
          <p className={styles.bookingTime}>{slot.label}</p>
          <label>
            Name
            <input
              ref={nameInput}
              className={styles.timezoneSearch}
              name="name"
              autoComplete="name"
              maxLength={120}
              required
              value={draft.name}
              onChange={(event) => onDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            Email for the calendar invite
            <input
              className={styles.timezoneSearch}
              name="email"
              type="email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              autoComplete="email"
              maxLength={254}
              required
              value={draft.email}
              onChange={(event) => onDraft({ ...draft, email: event.target.value })}
            />
          </label>
          <div className={styles.degradedActions}>
            <Button type="submit" disabled={disabled || !draft.name.trim() || !draft.email.trim()}>
              Review booking
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDraft({ ...draft, slotId: undefined })}
            >
              Change time
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className={styles.bookingTime}>{timeZoneLabel(timezone)}</p>
          <div className={styles.bookingTimes}>
            {options.slots.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => onDraft({ ...draft, slotId: item.id })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className={styles.degradedActions}>
            <Button
              type="button"
              variant="text"
              disabled={disabled}
              onClick={() => onTimes(timezone, options.slots.at(-1)?.end)}
            >
              {options.slots.length ? "More times" : "Show first times"}
            </Button>
            <Button
              type="button"
              variant="text"
              aria-expanded={changeTimezone}
              onClick={() => setChangeTimezone(!changeTimezone)}
            >
              Change time zone
            </Button>
          </div>
          {changeTimezone ? (
            <TimezoneChoices
              onChoose={(zone) => {
                setChangeTimezone(false);
                onTimes(zone);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
