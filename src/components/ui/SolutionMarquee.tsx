import styles from "./solution-marquee.module.css";

const DEFAULT_SOLUTIONS = [
  "Business automation",
  "AI agents",
  "Chatbots",
  "Custom software",
  "API integrations",
  "CRM",
] as const;

interface SolutionMarqueeProps {
  items?: readonly string[];
  label?: string;
}

export function SolutionMarquee({
  items = DEFAULT_SOLUTIONS,
  label = "Core solution areas",
}: SolutionMarqueeProps) {
  return (
    <div className={styles.marquee} role="region" aria-label={label} data-testid="solution-marquee">
      <div className={styles.track}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item} className={styles.item}>
              <span className={styles.label}>{item}</span>
              <span className={styles.dot} aria-hidden="true" />
            </li>
          ))}
        </ul>

        {[0, 1, 2].map((copy) => (
          <div key={copy} className={`${styles.list} ${styles.duplicate}`} aria-hidden="true">
            {items.map((item) => (
              <span key={`${copy}-${item}`} className={styles.item}>
                <span className={styles.label}>{item}</span>
                <span className={styles.dot} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
