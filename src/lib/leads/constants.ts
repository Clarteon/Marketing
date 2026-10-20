export const LEAD_FORM_MIN_SUBMIT_MS = 3_000;
export const LEAD_BODY_MAX_BYTES = 16 * 1024;
export const LEAD_RETENTION_MONTHS = 12;
export const LEAD_EMAIL_RATE_LIMIT = 3;
export const TURNSTILE_ACTION = "lead-form";

export const teamSizes = ["1", "2-10", "11-50", "51-200", "200+", "not-sure"] as const;
export type TeamSize = (typeof teamSizes)[number];

export const teamSizeLabels: Record<TeamSize, string> = {
  "1": "Just me",
  "2-10": "2–10 people",
  "11-50": "11–50 people",
  "51-200": "51–200 people",
  "200+": "More than 200 people",
  "not-sure": "Not sure yet",
};
