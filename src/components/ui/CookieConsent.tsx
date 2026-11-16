"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_NAME,
  OPEN_COOKIE_PREFS_EVENT,
  TIMEZONE_COOKIE_NAME,
  openCookiePreferences,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookies";
import { AnimatedCheckbox } from "./AnimatedCheckbox";
import styles from "./ui.module.css";

type ConsentSnapshot = CookieConsentChoice | "unset" | "ssr";

function subscribeConsent(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onStoreChange);
  };
}

function getClientConsentSnapshot(): ConsentSnapshot {
  return readCookieConsent() ?? "unset";
}

function getServerConsentSnapshot(): ConsentSnapshot {
  return "ssr";
}

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={openCookiePreferences}>
      Cookie preferences
    </button>
  );
}

export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getClientConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [allowPreferences, setAllowPreferences] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalExitTimerRef = useRef<number | null>(null);
  const modalActiveRef = useRef(false);

  const openModal = useCallback(() => {
    if (modalExitTimerRef.current !== null) {
      window.clearTimeout(modalExitTimerRef.current);
      modalExitTimerRef.current = null;
    }
    modalActiveRef.current = true;
    setAllowPreferences(readCookieConsent() === "all");
    setModalClosing(false);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    modalActiveRef.current = false;
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setModalClosing(false);
      setModalOpen(false);
      return;
    }
    setModalClosing(true);
    if (modalExitTimerRef.current !== null) {
      window.clearTimeout(modalExitTimerRef.current);
    }
    modalExitTimerRef.current = window.setTimeout(() => {
      modalExitTimerRef.current = null;
      setModalClosing(false);
      setModalOpen(false);
    }, 170);
  }, []);

  useEffect(
    () => () => {
      if (modalExitTimerRef.current !== null) {
        window.clearTimeout(modalExitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, openModal);
    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, openModal);
    };
  }, [openModal]);

  useEffect(() => {
    if (!modalOpen || modalClosing) return;
    dialogRef.current?.focus();
  }, [modalOpen, modalClosing]);

  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && modalActiveRef.current) {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, closeModal]);

  function openSettings() {
    openModal();
  }

  function applyChoice(choice: CookieConsentChoice) {
    saveCookieConsent(choice);
    closeModal();
  }

  const showBanner = consent === "unset" && (!modalOpen || modalClosing);

  return (
    <>
      {showBanner ? (
        <aside className={styles.cookieBanner} aria-label="Cookie notice">
          <div className={styles.cookieBannerHeader}>
            <h2 className={styles.cookieBannerTitle}>Cookie notice</h2>
            <p className={styles.cookieBannerText}>
              We use strictly essential cookies for security and optional preference cookies for
              your timezone.{" "}
              <Link href="/privacy" className={styles.cookieInlineLink}>
                Privacy Policy &amp; Cookies
              </Link>
              .
            </p>
          </div>
          <div className={styles.cookieBannerActions}>
            <button
              type="button"
              className={styles.cookieAcceptButton}
              onClick={() => applyChoice("all")}
            >
              Allow preference cookies
            </button>
            <button
              type="button"
              className={styles.cookieSecondaryButton}
              onClick={() => applyChoice("essential")}
            >
              Essential only
            </button>
            <button type="button" className={styles.cookieTextButton} onClick={openSettings}>
              Cookie settings
            </button>
          </div>
        </aside>
      ) : null}

      {modalOpen ? (
        <div
          className={styles.cookieModalBackdrop}
          data-state={modalClosing ? "closed" : "open"}
          aria-hidden={modalClosing ? "true" : undefined}
          onClick={(event) => {
            if (!modalClosing && event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            ref={dialogRef}
            className={styles.cookieModal}
            data-state={modalClosing ? "closed" : "open"}
            role={modalClosing ? undefined : "dialog"}
            aria-modal={modalClosing ? undefined : "true"}
            aria-labelledby={modalClosing ? undefined : "cookie-preferences-title"}
            tabIndex={-1}
          >
            <div className={styles.cookieModalHeader}>
              <h2 id="cookie-preferences-title" className={styles.cookieModalTitle}>
                Cookie preferences
              </h2>
              <button
                type="button"
                className={styles.cookieCloseButton}
                aria-label="Close cookie preferences"
                onClick={closeModal}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className={styles.cookieModalBody}>
              <p className={styles.cookieModalIntro}>
                Manage how Clarteon stores cookies in your browser. We do not use advertising,
                retargeting, or cross-site tracking cookies. See our{" "}
                <Link href="/privacy" onClick={closeModal}>
                  Privacy Policy &amp; Cookies
                </Link>{" "}
                for retention and subprocessor details.
              </p>

              <div className={styles.cookieCategoryList}>
                <section className={styles.cookieCategory}>
                  <div className={styles.cookieCategoryTop}>
                    <div>
                      <h3 className={styles.cookieCategoryTitle}>Strictly essential cookies</h3>
                      <p className={styles.cookieCategoryDesc}>
                        Required for security verification, chat rate limits, administrative login,
                        and recording your consent selection. These remain active automatically.
                      </p>
                    </div>
                    <span className={styles.cookieBadgeRequired}>Always active</span>
                  </div>
                  <ul className={styles.cookieDetailList}>
                    <li>
                      <code>{COOKIE_CONSENT_NAME}</code>: saves your cookie preference for 180 days.
                    </li>
                    <li>
                      <code>clarteon_chat</code>: signed session cookie scoped to{" "}
                      <code>/api/chat</code> for chat continuity and fair-use rate limits.
                    </li>
                    <li>
                      <code>clarteon_admin</code>: administrator authentication cookie used only on{" "}
                      <code>/admin</code>.
                    </li>
                    <li>
                      Cloudflare Turnstile: ephemeral anti-abuse verification on forms and chat.
                    </li>
                  </ul>
                </section>

                <section className={styles.cookieCategory}>
                  <div className={styles.cookieCategoryTop}>
                    <div>
                      <h3 className={styles.cookieCategoryTitle}>Visitor preference cookies</h3>
                      <p className={styles.cookieCategoryDesc}>
                        Optional functionality that remembers your selected display timezone across
                        discovery-call scheduling visits.
                      </p>
                    </div>
                    <AnimatedCheckbox
                      id="cookie-preferences-toggle"
                      compact
                      className={styles.cookieToggleLabel}
                      checked={allowPreferences}
                      onChange={(event) => setAllowPreferences(event.target.checked)}
                    >
                      {allowPreferences ? "Enabled" : "Disabled"}
                    </AnimatedCheckbox>
                  </div>
                  <ul className={styles.cookieDetailList}>
                    <li>
                      <code>{TIMEZONE_COOKIE_NAME}</code>: stores your selected booking scheduler
                      timezone for 180 days when enabled. Disabling deletes any saved value.
                    </li>
                  </ul>
                </section>

                <section className={styles.cookieCategory}>
                  <div className={styles.cookieCategoryTop}>
                    <div>
                      <h3 className={styles.cookieCategoryTitle}>Cookieless analytics</h3>
                      <p className={styles.cookieCategoryDesc}>
                        Cloudflare Web Analytics records aggregate page counts and performance
                        metrics without storing cookies or tracking individuals across websites.
                      </p>
                    </div>
                    <span className={styles.cookieBadgeNeutral}>Cookieless</span>
                  </div>
                </section>
              </div>
            </div>

            <div className={styles.cookieModalFooter}>
              <button
                type="button"
                className={styles.cookieSecondaryButton}
                onClick={() => applyChoice("essential")}
              >
                Essential only
              </button>
              <button
                type="button"
                className={styles.cookieSecondaryButton}
                onClick={() => applyChoice(allowPreferences ? "all" : "essential")}
              >
                Save preferences
              </button>
              <button
                type="button"
                className={styles.cookieAcceptButton}
                onClick={() => applyChoice("all")}
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
