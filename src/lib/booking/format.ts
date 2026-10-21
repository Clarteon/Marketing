function dateValue(iso: string): Date {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) throw new Error("Invalid booking date.");
  return value;
}

export function formatSlotDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(dateValue(iso));
}

export function formatSlotTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(dateValue(iso));
}

export function formatSlotDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(dateValue(iso));
}

export function slotDateKey(iso: string, timeZone: string): string {
  const values: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue(iso))) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function timeZoneLabel(timeZone: string): string {
  const name = timeZone.replaceAll("_", " ");
  try {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return offset && offset !== name ? `${name} (${offset})` : name;
  } catch {
    return name;
  }
}
