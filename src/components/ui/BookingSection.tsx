"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { DeferredForm } from "./DeferredForm";
import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./ui.module.css";

interface BookingSectionProps {
  id?: string;
  mode?: "link" | "placeholder" | "form";
  tone?: "ink" | "lime";
  title?: string;
  body?: string;
  turnstileSiteKey?: string;
}

const defaultTitle = "Tell us the problem. We will find the clearest way through.";
const defaultBody =
  "A discovery call is a short conversation about what is slowing you down and what a good outcome looks like.";
const highlightPhrase = "clearest way through";

function renderHighlightedTitle(
  title: string,
  highlightRef: RefObject<HTMLSpanElement | null>,
  highlightOn: boolean,
) {
  const phrase = title.includes(highlightPhrase) ? highlightPhrase : "discovery call";
  if (!title.includes(phrase)) {
    return title;
  }

  const [before, ...rest] = title.split(phrase);
  const after = rest.join(phrase);
  const trailing = after.match(/^[.,!?;:]+/)?.[0] ?? "";
  return (
    <>
      {before}
      <span
        ref={highlightRef}
        className={cx(styles.bookingHighlight, highlightOn && styles.bookingHighlightOn)}
      >
        <span className={styles.bookingHighlightText}>
          {phrase}
          {trailing}
        </span>
      </span>
      {after.slice(trailing.length)}
    </>
  );
}

export function BookingSection({
  id = "book",
  mode = "link",
  tone = "ink",
  title = defaultTitle,
  body = defaultBody,
  turnstileSiteKey,
}: BookingSectionProps) {
  const titleId = `${id}-title`;
  const onLime = tone === "lime";
  const sectionRef = useRef<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const [highlightOn, setHighlightOn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const highlightNode = highlightRef.current;
    if (!highlightNode) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setHighlightOn(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHighlightOn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(highlightNode);
    return () => observer.disconnect();
  }, [pathname, title]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const node = sectionRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    node.style.setProperty("--glow-x", `${x}px`);
    node.style.setProperty("--glow-y", `${y}px`);
    node.style.setProperty("--glow-opacity", "1");
  };

  const handleMouseLeave = () => {
    const node = sectionRef.current;
    if (!node) return;
    node.style.setProperty("--glow-opacity", "0");
  };

  return (
    <Section
      ref={sectionRef}
      tone={tone}
      id={id}
      aria-labelledby={titleId}
      className={cx(
        styles.bookingSection,
        mode === "form" && styles.bookingSectionForm,
        onLime ? styles.bookingSectionLime : styles.bookingSectionInk,
      )}
      background={<div className={styles.bookingAmbientFlow} aria-hidden="true" />}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${styles.booking} ${mode === "form" ? styles.bookingFormLayout : ""}`}>
        <div className={styles.bookingContent}>
          {onLime ? null : <p className={styles.eyebrow}>Next step</p>}
          <h2 id={titleId} className={styles.bookingTitle}>
            {renderHighlightedTitle(title, highlightRef, highlightOn)}
          </h2>
          {mode === "link" || mode === "form" ? (
            <p className={styles.bookingIntro}>{body}</p>
          ) : null}
        </div>

        <div className={styles.bookingActions}>
          {mode === "form" ? (
            <DeferredForm kind="booking" turnstileSiteKey={turnstileSiteKey} />
          ) : mode === "link" ? (
            <>
              <Button href="/contact#book" variant={onLime ? "dark" : "primary"} size="large">
                Book a free discovery call
              </Button>
              <Button href="/contact#brief" variant="secondary" size="large">
                Send a project brief
              </Button>
              <Button href="/contact#message" variant="text">
                Or message us
              </Button>
            </>
          ) : (
            <div className={styles.bookingPlaceholder}>
              <p>{body}</p>
              <Button href="#brief" variant="secondary">
                Go to the project brief
              </Button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
