"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./animated-checkbox.module.css";

interface AnimatedCheckboxProps {
  id?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  ariaDescribedBy?: string;
  className?: string;
  textClassName?: string;
  children: ReactNode;
}

export function AnimatedCheckbox({
  id,
  name,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  required = false,
  compact = false,
  ariaDescribedBy,
  className,
  textClassName,
  children,
}: AnimatedCheckboxProps) {
  const [phase, setPhase] = useState<"idle" | "enter" | "exit">("idle");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setPhase(event.target.checked ? "enter" : "exit");
    onChange?.(event);
  }

  return (
    <label
      htmlFor={id}
      className={cx(
        styles.checkboxLabel,
        compact && styles.checkboxLabelCompact,
        disabled && styles.checkboxDisabled,
        className,
      )}
    >
      <span
        className={styles.checkboxControl}
        data-phase={phase}
        onAnimationEnd={() => setPhase("idle")}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          className={styles.checkboxInput}
          {...(checked !== undefined ? { checked } : { defaultChecked })}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-describedby={ariaDescribedBy}
        />
        <span className={styles.checkboxBox} aria-hidden="true">
          <svg className={styles.checkboxMark} viewBox="0 0 18 18" fill="none">
            <path
              className={styles.checkboxPath}
              d="M4.2 9.4L7.4 12.6L14 5.6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      <span className={cx(styles.checkboxText, textClassName)}>{children}</span>
    </label>
  );
}
