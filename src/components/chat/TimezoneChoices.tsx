"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";

export function detectedTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function locationLabel(zone: string): string {
  const city = zone.split("/").at(-1)!.replaceAll("_", " ");
  const name = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "long" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  return name && name !== city ? `${city} — ${name}` : city;
}

export function TimezoneChoices({ onChoose }: { onChoose: (zone: string, label: string) => void }) {
  const [detected] = useState(detectedTimezone);
  const [choosing, setChoosing] = useState(!detected);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (choosing) searchRef.current?.focus({ preventScroll: true });
  }, [choosing]);
  useEffect(() => {
    const log = searchRef.current?.closest<HTMLElement>('[role="log"]');
    if (log) log.scrollTop = log.scrollHeight;
  }, [choosing, query]);
  const [zones] = useState(() => {
    try {
      return [
        ...new Set([...(detected ? [detected] : []), "UTC", ...Intl.supportedValuesOf("timeZone")]),
      ].map((zone) => ({ zone, label: locationLabel(zone) }));
    } catch {
      return ["UTC", "Asia/Manila", "Europe/London", "America/New_York", "Australia/Sydney"].map(
        (zone) => ({ zone, label: locationLabel(zone) }),
      );
    }
  });
  const matches = zones.filter(({ label, zone }) =>
    `${label} ${zone}`.toLowerCase().replaceAll("_", " ").includes(query.trim().toLowerCase()),
  );

  return (
    <div className={styles.timezoneChoices} role="group" aria-label="Choose your local time">
      {detected ? (
        <>
          <p>Detected from your device: {locationLabel(detected)}.</p>
          <div className={styles.quickStarts}>
            <button type="button" onClick={() => onChoose(detected, locationLabel(detected))}>
              Yes, use this time
            </button>
            <button type="button" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
              Choose another location
            </button>
          </div>
        </>
      ) : (
        <p>Choose a city to show call times in your local time.</p>
      )}
      {choosing ? (
        <>
          <label htmlFor="clara-timezone-search">Search city or time zone</label>
          <input
            ref={searchRef}
            id="clara-timezone-search"
            className={styles.timezoneSearch}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example, Manila or London"
          />
          <div className={styles.timezoneResults}>
            {matches.slice(0, 8).map(({ zone, label }) => (
              <button key={zone} type="button" onClick={() => onChoose(zone, label)}>
                {label}
              </button>
            ))}
          </div>
          <p role="status">
            {matches.length > 8
              ? `${matches.length} matches. Type more to narrow the choices.`
              : matches.length
                ? "Select a city above to use its local time."
                : "No matches. Try a nearby major city, or tell Clara your city in the message below."}
          </p>
        </>
      ) : null}
    </div>
  );
}
