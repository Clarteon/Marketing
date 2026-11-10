"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./dropdown.module.css";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function Dropdown({ label, value, options, onChange, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setHighlighted(-1);
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (
        open &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, close]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!open) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          setHighlighted(options.findIndex((option) => option.value === value));
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((previous) => (previous + 1) % options.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((previous) => (previous - 1 + options.length) % options.length);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (highlighted >= 0) {
          const next = options[highlighted].value;
          if (next !== value) onChange(next);
        }
        close();
        return;
      }
    },
    [open, value, options, highlighted, onChange, close],
  );

  const selectOption = useCallback(
    (nextValue: string) => {
      if (nextValue !== value) onChange(nextValue);
      close();
    },
    [value, onChange, close],
  );

  return (
    <div className={cx(styles.dropdown, className)}>
      <button
        ref={triggerRef}
        className={cx(styles.trigger, open && styles.triggerOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((previous) => !previous);
          if (!open) {
            setHighlighted(options.findIndex((option) => option.value === value));
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.triggerLabel}>{selectedOption?.label ?? label}</span>
        <svg
          className={cx(styles.triggerIcon, open && styles.triggerIconOpen)}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m5.5 7.5 4.5 4.5 4.5-4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <ul ref={menuRef} className={styles.menu} role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const active = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={active}
                className={cx(
                  styles.option,
                  active && styles.optionActive,
                  highlighted === index && styles.optionHighlighted,
                )}
                onMouseMove={() => setHighlighted(index)}
                onClick={(event) => {
                  event.stopPropagation();
                  selectOption(option.value);
                }}
              >
                <span className={styles.optionText}>{option.label}</span>
                {active ? (
                  <span className={styles.optionCheck} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
