const manilaDate = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function dateLabel(value: string | Date): string {
  try {
    return manilaDate.format(new Date(value));
  } catch {
    return String(value);
  }
}
