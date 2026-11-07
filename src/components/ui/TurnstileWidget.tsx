"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light" | "dark" | "auto";
      appearance: "always" | "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "clarteon-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const VERIFICATION_WAIT_MS = 15_000;
let scriptLoad: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  if (scriptLoad) return scriptLoad;
  if (window.turnstile) return Promise.resolve(window.turnstile);

  scriptLoad = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;

    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Turnstile could not load."));
    };
    const timeout = window.setTimeout(fail, VERIFICATION_WAIT_MS);
    script.addEventListener("error", fail, { once: true });
    script.addEventListener(
      "load",
      () => {
        const api = window.turnstile;
        if (!api || typeof api.render !== "function") {
          fail();
          return;
        }
        window.clearTimeout(timeout);
        resolve(api);
      },
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptLoad = undefined;
    throw error;
  });
  return scriptLoad;
}

export function preloadTurnstile() {
  void loadTurnstile().catch(() => {});
}

interface TurnstileWidgetProps {
  siteKey: string;
  action: string;
  appearance?: "always" | "interaction-only";
  onToken: (token: string) => void;
  onError: () => void;
}

export function TurnstileWidget({
  siteKey,
  action,
  appearance = "always",
  onToken,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onToken, onError });
  const [check, setCheck] = useState<"checking" | "slow" | "failed" | "ready">("checking");
  const [attempt, setAttempt] = useState(0);
  const inline = appearance === "interaction-only";

  useEffect(() => {
    callbacksRef.current = { onToken, onError };
  }, [onToken, onError]);

  useEffect(() => {
    let widgetId: string | undefined;
    let api: TurnstileApi | undefined;
    let cancelled = false;
    let slowTimer: number | undefined;
    const watchWait = () => {
      window.clearTimeout(slowTimer);
      if (inline) slowTimer = window.setTimeout(() => setCheck("slow"), VERIFICATION_WAIT_MS);
    };
    watchWait();

    const reportSlow = () => {
      if (cancelled) return;
      if (inline) setCheck("slow");
      callbacksRef.current.onError();
    };

    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        api = turnstile;
        widgetId = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          appearance,
          callback: (token) => {
            if (cancelled) return;
            window.clearTimeout(slowTimer);
            if (inline) setCheck("ready");
            callbacksRef.current.onToken(token);
          },
          "expired-callback": () => {
            if (cancelled) return;
            if (inline) setCheck("checking");
            watchWait();
            callbacksRef.current.onError();
          },
          "error-callback": reportSlow,
          "timeout-callback": reportSlow,
        });
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(slowTimer);
        setCheck("failed");
        callbacksRef.current.onError();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      if (widgetId) api?.remove(widgetId);
    };
  }, [siteKey, action, appearance, inline, attempt]);

  if (!inline && check === "failed") {
    return (
      <p className={styles.hint}>Verification could not load. Refresh the page and try again.</p>
    );
  }

  return (
    <>
      {inline && check !== "ready" ? (
        <div className={styles.turnstileStatus}>
          <span role="status">
            {check === "failed"
              ? "Verification couldn’t load."
              : check === "slow"
                ? "Verification is taking longer than usual."
                : "Verifying your browser…"}
          </span>
          {check === "failed" || check === "slow" ? (
            <button
              type="button"
              onClick={() => {
                onError();
                setCheck("checking");
                setAttempt((value) => value + 1);
              }}
            >
              Retry verification
            </button>
          ) : null}
        </div>
      ) : null}
      <div ref={containerRef} className={inline ? undefined : styles.turnstile} />
    </>
  );
}
