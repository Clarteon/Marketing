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
}

export function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const selectedOption = options.find((option) => option.value === value);
  const menuActive = open && !closing;

  const openMenu = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
    setOpen(true);
    setHighlighted(options.findIndex((option) => option.value === value));
  }, [options, value]);

  const close = useCallback(() => {
    setHighlighted(-1);
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setClosing(false);
      setOpen(false);
      return;
    }
    setClosing(true);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setClosing(false);
      setOpen(false);
    }, 150);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (
        menuActive &&
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
  }, [menuActive, close]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!menuActive) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          event.preventDefault();
          openMenu();
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
    [menuActive, openMenu, value, options, highlighted, onChange, close],
  );

  const selectOption = useCallback(
    (nextValue: string) => {
      if (nextValue !== value) onChange(nextValue);
      close();
    },
    [value, onChange, close],
  );

  return (
    <div className={styles.dropdown}>
      <button
        ref={triggerRef}
        className={cx(styles.trigger, menuActive && styles.triggerOpen)}
        aria-haspopup="listbox"
        aria-expanded={menuActive}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          if (menuActive) {
            close();
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.triggerLabel}>{selectedOption?.label ?? label}</span>
        <svg
          className={cx(styles.triggerIcon, menuActive && styles.triggerIconOpen)}
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
        <ul
          ref={menuRef}
          className={styles.menu}
          data-state={closing ? "closed" : "open"}
          role={closing ? undefined : "listbox"}
          aria-label={closing ? undefined : label}
          aria-hidden={closing ? "true" : undefined}
        >
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
