"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { site } from "@/lib/site";
import { cx } from "@/lib/cx";
import styles from "./deferred-form.module.css";

type FormComponent = ComponentType<{ turnstileSiteKey?: string }>;

export function DeferredForm({
  kind,
  turnstileSiteKey,
}: {
  kind: "booking" | "brief";
  turnstileSiteKey?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [Form, setForm] = useState<FormComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const label = kind === "booking" ? "booking form" : "project brief form";

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let active = true;
    const activate = () => {
      if (active) setAttempt((current) => current || 1);
    };
    const sectionId = node.closest("[id]")?.id;
    const matchesHash = () => Boolean(sectionId && window.location.hash === `#${sectionId}`);

    if (matchesHash()) {
      queueMicrotask(activate);
    }

    const onHashChange = () => {
      if (matchesHash()) activate();
    };

    const onAnchorClick = (event: MouseEvent) => {
      if (!sectionId || !(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href === `#${sectionId}` || href?.endsWith(`#${sectionId}`)) {
        activate();
      }
    };

    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onAnchorClick, true);

    if (typeof IntersectionObserver !== "function") {
      queueMicrotask(activate);
      return () => {
        active = false;
        window.removeEventListener("hashchange", onHashChange);
        document.removeEventListener("click", onAnchorClick, true);
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        activate();
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onAnchorClick, true);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!attempt) return;
    let active = true;
    const loaded =
      kind === "booking"
        ? import("./BookingForm").then((module) => module.BookingForm)
        : import("./ProjectBriefForm").then((module) => module.ProjectBriefForm);
    loaded
      .then((Component) => {
        if (!active) return;
        restoreFocus.current = Boolean(container.current?.contains(document.activeElement));
        setForm(() => Component);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, kind]);

  useEffect(() => {
    if (Form && restoreFocus.current && document.activeElement === document.body) {
      container.current
        ?.querySelector<HTMLElement>('input[autocomplete="name"], button, select, textarea')
        ?.focus();
    }
  }, [Form]);

  return (
    <div
      ref={container}
      data-deferred-form={kind}
      data-loaded={Form ? "true" : "false"}
      className={cx(
        styles.frame,
        kind === "booking" && styles.booking,
        kind === "brief" && styles.brief,
        !Form && styles.placeholder,
      )}
      aria-busy={Boolean(attempt) && !Form && !failed}
    >
      {Form ? (
        <Form turnstileSiteKey={turnstileSiteKey} />
      ) : failed ? (
        <p role="alert">
          The {label} couldn’t load. Please refresh the page or{" "}
          <a href={`mailto:${site.email}`}>email the team</a>.
        </p>
      ) : (
        <button
          type="button"
          className={styles.load}
          onClick={() => setAttempt((current) => current || 1)}
        >
          {attempt ? `Loading ${label}…` : `Load ${label}`}
        </button>
      )}
    </div>
  );
}
