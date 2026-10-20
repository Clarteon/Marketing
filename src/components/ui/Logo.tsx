import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

interface LogoProps {
  variant?: "full" | "symbol";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <span className={cx(styles.logo, className)}>
      <svg
        className={styles.symbol}
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#C6F432" />
        <path
          d="M21.3 10a8 8 0 1 0 0 12"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="2.6" fill="#0A0A0A" />
      </svg>
      {variant === "full" ? (
        <span className={styles.wordmark}>Clarteon</span>
      ) : (
        <span className="sr-only">Clarteon</span>
      )}
    </span>
  );
}
