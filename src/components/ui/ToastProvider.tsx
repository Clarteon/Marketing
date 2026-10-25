"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import styles from "./toast.module.css";

export type ToastKind = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  kind: ToastKind;
  message: string;
  dedupeKey?: string;
  durationMs?: number | null;
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastOptions {
  id: string;
  dedupeKey: string;
  durationMs: number | null;
}

export interface ToastApi {
  addToast: (options: ToastOptions) => string;
  updateToast: (id: string, options: Partial<ToastOptions>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const EXIT_MS = 220;

function defaultDuration(kind: ToastKind): number | null {
  if (kind === "loading") return null;
  if (kind === "warning") return 6_500;
  if (kind === "error") return 8_000;
  return 4_500;
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "loading") return <span className={styles.spinner} aria-hidden="true" />;

  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      {kind === "warning" ? (
        <>
          <path d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Z" />
          <path
            className={styles.iconMark}
            d="M11 6.7h2l-.25 7h-1.5L11 6.7Zm1 11a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"
          />
        </>
      ) : (
        <>
          <path d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Z" />
          {kind === "success" ? (
            <path
              className={styles.iconMark}
              d="m7.5 12.1 2.9 2.9 6.3-6.3 1.4 1.4-7.7 7.7-4.3-4.3 1.4-1.4Z"
            />
          ) : kind === "error" ? (
            <path
              className={styles.iconMark}
              d="m8.1 6.7 3.9 3.9 3.9-3.9 1.4 1.4-3.9 3.9 3.9 3.9-1.4 1.4-3.9-3.9-3.9 3.9-1.4-1.4 3.9-3.9-3.9-3.9 1.4-1.4Z"
            />
          ) : (
            <path
              className={styles.iconMark}
              d="M11 6.7h2l-.25 7h-1.5L11 6.7Zm1 11a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"
            />
          )}
        </>
      )}
    </svg>
  );
}

function ToastItem({ entry, onRemove }: { entry: ToastEntry; onRemove: (id: string) => void }) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(entry.durationMs ?? 0);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);

  const requestClose = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimerRef.current = window.setTimeout(() => onRemove(entry.id), reduceMotion ? 0 : EXIT_MS);
    return () => {
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    };
  }, [closing, entry.id, onRemove]);

  useEffect(() => {
    remainingRef.current = entry.durationMs ?? 0;
    if (entry.durationMs === null) return;

    const startTimer = () => {
      if (timerRef.current !== null || hoveredRef.current || focusedRef.current) return;
      startedAtRef.current = Date.now();
      timerRef.current = window.setTimeout(requestClose, remainingRef.current);
    };

    const clearTimer = () => {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAtRef.current),
      );
    };

    startTimer();
    return () => {
      clearTimer();
    };
  }, [entry.durationMs, entry.id, entry.kind, entry.message, requestClose]);

  function pauseTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAtRef.current),
      );
    }
  }

  function onPointerEnter() {
    hoveredRef.current = true;
    pauseTimer();
  }

  function onPointerLeave() {
    hoveredRef.current = false;
    resumeTimer();
  }

  function onFocus() {
    focusedRef.current = true;
    pauseTimer();
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focusedRef.current = false;
    resumeTimer();
  }

  function resumeTimer() {
    if (
      entry.durationMs === null ||
      timerRef.current !== null ||
      hoveredRef.current ||
      focusedRef.current ||
      closing
    ) {
      return;
    }
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(requestClose, remainingRef.current);
  }

  const label =
    entry.kind === "info" ? "Information" : entry.kind[0]!.toUpperCase() + entry.kind.slice(1);

  return (
    <div
      className={`${styles.toast} ${styles[entry.kind]}${closing ? ` ${styles.closing}` : ""}`}
      role={entry.kind === "error" ? "alert" : "status"}
      aria-label={`${label}: ${entry.message}`}
      aria-live={entry.kind === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <ToastIcon kind={entry.kind} />
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.message}>{entry.message}</p>
        {entry.action ? (
          <button
            className={styles.action}
            type="button"
            onClick={() => {
              entry.action?.onClick();
              requestClose();
            }}
          >
            {entry.action.label}
          </button>
        ) : null}
      </div>
      <button
        className={styles.close}
        type="button"
        aria-label={`Dismiss notification: ${entry.message}`}
        onClick={requestClose}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const entriesRef = useRef(entries);
  const sequenceRef = useRef(0);

  const commit = useCallback((update: (current: ToastEntry[]) => ToastEntry[]) => {
    const next = update(entriesRef.current);
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const addToast = useCallback(
    (options: ToastOptions) => {
      const dedupeKey = options.dedupeKey ?? `${options.kind}:${options.message}`;
      const existing = entriesRef.current.find((entry) => entry.dedupeKey === dedupeKey);
      if (existing) {
        commit((current) =>
          current.map((entry) =>
            entry.id === existing.id
              ? {
                  ...entry,
                  ...options,
                  dedupeKey,
                  durationMs:
                    options.durationMs === undefined
                      ? defaultDuration(options.kind)
                      : options.durationMs,
                }
              : entry,
          ),
        );
        return existing.id;
      }

      const id = `toast-${Date.now()}-${++sequenceRef.current}`;
      commit((current) => [
        ...current,
        {
          ...options,
          id,
          dedupeKey,
          durationMs:
            options.durationMs === undefined ? defaultDuration(options.kind) : options.durationMs,
        },
      ]);
      return id;
    },
    [commit],
  );

  const updateToast = useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      commit((current) =>
        current.map((entry) => {
          if (entry.id !== id) return entry;
          const kind = options.kind ?? entry.kind;
          const message = options.message ?? entry.message;
          return {
            ...entry,
            ...options,
            kind,
            dedupeKey:
              options.dedupeKey ??
              (options.kind || options.message ? `${kind}:${message}` : entry.dedupeKey),
            durationMs:
              options.durationMs !== undefined
                ? options.durationMs
                : options.kind
                  ? defaultDuration(kind)
                  : entry.durationMs,
          };
        }),
      );
    },
    [commit],
  );

  const dismissToast = useCallback(
    (id: string) => commit((current) => current.filter((entry) => entry.id !== id)),
    [commit],
  );

  const api = { addToast, updateToast, dismissToast };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Notifications">
        {entries.map((entry) => (
          <ToastItem key={entry.id} entry={entry} onRemove={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
