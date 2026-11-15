export const COOKIE_CONSENT_NAME = "clarteon_cookie_consent";
export const TIMEZONE_COOKIE_NAME = "clarteon_timezone";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const OPEN_COOKIE_PREFS_EVENT = "clarteon:open-cookie-preferences";
export const COOKIE_CONSENT_CHANGED_EVENT = "clarteon:cookie-consent-changed";

export type CookieConsentChoice = "essential" | "all";

function readRawCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const entries = document.cookie.split(";");
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const raw = trimmed.slice(prefix.length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function cookieSecurityAttribute(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function writeCookie(name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${cookieSecurityAttribute()}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecurityAttribute()}`;
}

export function readCookieConsent(): CookieConsentChoice | null {
  const value = readRawCookie(COOKIE_CONSENT_NAME);
  if (value === "essential" || value === "all") return value;
  return null;
}

export function hasPreferenceConsent(): boolean {
  return readCookieConsent() === "all";
}

export function saveCookieConsent(choice: CookieConsentChoice): void {
  writeCookie(COOKIE_CONSENT_NAME, choice);
  if (choice === "essential") {
    deleteCookie(TIMEZONE_COOKIE_NAME);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<CookieConsentChoice>(COOKIE_CONSENT_CHANGED_EVENT, { detail: choice }),
    );
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function readPreferredTimeZone(): string | null {
  if (!hasPreferenceConsent()) return null;
  const value = readRawCookie(TIMEZONE_COOKIE_NAME);
  if (!value || !isValidTimeZone(value)) return null;
  return value;
}

export function savePreferredTimeZone(timeZone: string): void {
  if (!hasPreferenceConsent() || !isValidTimeZone(timeZone)) return;
  writeCookie(TIMEZONE_COOKIE_NAME, timeZone);
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFS_EVENT));
}
