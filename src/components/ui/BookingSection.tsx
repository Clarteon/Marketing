"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cx } from "@/lib/cx";
import { BookingForm } from "./BookingForm";
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

function renderHighlightedTitle(title: string, underlinePathRef: RefObject<SVGPathElement | null>) {
  if (!title.includes(highlightPhrase)) {
    return title;
  }

  const parts = title.split(highlightPhrase);
  return (
    <>
      {parts[0]}
      <span className={styles.bookingUnderlineWrap}>
        <span className={styles.bookingUnderlineText}>{highlightPhrase}</span>
        <svg
          className={styles.bookingUnderlineSvg}
          viewBox="0 0 340 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            ref={underlinePathRef}
            className={styles.bookingUnderlinePath}
            d="M 3 11 C 75 4, 185 14, 335 8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {parts.slice(1).join(highlightPhrase)}
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
  const underlinePathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const sectionNode = sectionRef.current;
    const underlinePath = underlinePathRef.current;
    if (!sectionNode || !underlinePath) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      underlinePath.style.strokeDashoffset = "0";
      return;
    }

    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { top } = sectionNode.getBoundingClientRect();
        const start = window.innerHeight * 0.85;
        const end = window.innerHeight * 0.25;
        const progress = Math.min(1, Math.max(0, (start - top) / (start - end)));
        underlinePath.style.strokeDashoffset = String(480 * (1 - progress));
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

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
            {renderHighlightedTitle(title, underlinePathRef)}
          </h2>
          {mode === "link" || mode === "form" ? (
            <p className={styles.bookingIntro}>{body}</p>
          ) : null}
        </div>

        <div className={styles.bookingActions}>
          {mode === "form" ? (
            <BookingForm turnstileSiteKey={turnstileSiteKey} />
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
