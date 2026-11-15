import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieConsent, CookiePreferencesButton } from "@/components/ui/CookieConsent";
import {
  COOKIE_CONSENT_NAME,
  TIMEZONE_COOKIE_NAME,
  openCookiePreferences,
  readCookieConsent,
  readPreferredTimeZone,
  saveCookieConsent,
  savePreferredTimeZone,
} from "@/lib/cookies";

function clearAllCookies() {
  document.cookie = `${COOKIE_CONSENT_NAME}=; Path=/; Max-Age=0`;
  document.cookie = `${TIMEZONE_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

describe("cookie consent system", () => {
  beforeEach(() => {
    clearAllCookies();
  });

  afterEach(() => {
    cleanup();
    clearAllCookies();
  });

  it("shows the banner when no cookie choice exists and saves preferences", async () => {
    const { container } = render(<CookieConsent />);

    expect(await screen.findByRole("complementary", { name: "Cookie notice" })).toBeInTheDocument();
    await expectNoViolations(container);

    fireEvent.click(screen.getByRole("button", { name: "Allow preference cookies" }));

    expect(readCookieConsent()).toBe("all");
    expect(screen.queryByRole("complementary", { name: "Cookie notice" })).not.toBeInTheDocument();

    savePreferredTimeZone("Asia/Manila");
    expect(readPreferredTimeZone()).toBe("Asia/Manila");

    saveCookieConsent("essential");
    expect(readPreferredTimeZone()).toBeNull();
    expect(document.cookie).not.toContain(`${TIMEZONE_COOKIE_NAME}=`);
  });

  it("opens the preferences dialog from the footer trigger and persists toggle state", async () => {
    saveCookieConsent("essential");
    const { container } = render(
      <>
        <CookiePreferencesButton />
        <CookieConsent />
      </>,
    );

    expect(screen.queryByRole("complementary", { name: "Cookie notice" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cookie preferences" }));

    const dialog = await screen.findByRole("dialog", { name: "Cookie preferences" });
    expect(dialog).toBeInTheDocument();
    await expectNoViolations(container);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Cookie preferences" })).not.toBeInTheDocument();
    });
    expect(readCookieConsent()).toBe("all");

    openCookiePreferences();
    expect(await screen.findByRole("dialog", { name: "Cookie preferences" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Cookie preferences" })).not.toBeInTheDocument();
    });
  });
});
