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
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
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

interface TurnstileWidgetProps {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  onError: () => void;
}

export function TurnstileWidget({ siteKey, action, onToken, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onToken, onError });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onToken, onError };
  }, [onToken, onError]);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    let createdScript: HTMLScriptElement | null = null;
    let existingScript: HTMLScriptElement | null = null;

    const renderWidget = () => {
      if (cancelled || widgetId || !containerRef.current || !window.turnstile) return;

      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        callback: (token) => callbacksRef.current.onToken(token),
        "expired-callback": () => callbacksRef.current.onError(),
        "error-callback": () => callbacksRef.current.onError(),
      });
    };

    const handleError = () => {
      if (cancelled) return;
      const script = existingScript ?? createdScript;
      script?.remove();
      setFailed(true);
      callbacksRef.current.onError();
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      const handleLoad = () => renderWidget();

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad);
        existingScript.addEventListener("error", handleError);
      } else {
        createdScript = document.createElement("script");
        createdScript.id = SCRIPT_ID;
        createdScript.src = SCRIPT_URL;
        createdScript.async = true;
        createdScript.defer = true;
        createdScript.addEventListener("load", handleLoad);
        createdScript.addEventListener("error", handleError);
        document.head.appendChild(createdScript);
      }

      return () => {
        cancelled = true;
        if (widgetId) window.turnstile?.remove(widgetId);
        const script = existingScript ?? createdScript;
        script?.removeEventListener("load", handleLoad);
        script?.removeEventListener("error", handleError);
      };
    }

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, action]);

  if (failed) {
    return (
      <p className={styles.hint}>Verification could not load. Refresh the page and try again.</p>
    );
  }

  return <div ref={containerRef} className={styles.turnstile} />;
}
