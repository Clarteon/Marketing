import Link from "next/link";
import styles from "./ui.module.css";

export interface HeroDirectoryItem {
  label: string;
  href: string;
  meta?: string;
  external?: boolean;
}

export interface HeroDirectoryProps {
  heading: string;
  note?: string;
  items: readonly HeroDirectoryItem[];
}

export function HeroDirectory({ heading, note, items }: HeroDirectoryProps) {
  return (
    <aside className={styles.heroDirectory} aria-label={heading}>
      <div className={styles.heroDirectoryHead}>
        <p className={styles.heroDirectoryHeading}>{heading}</p>
        {note ? <p className={styles.heroDirectoryNote}>{note}</p> : null}
      </div>

      <ol className={styles.heroDirectoryList}>
        {items.map((item, index) => {
          const number = String(index + 1).padStart(2, "0");
          const isAnchor = item.href.startsWith("#");
          const content = (
            <>
              <span className={styles.heroDirectoryIndex} aria-hidden="true">
                {number}
              </span>
              <span className={styles.heroDirectoryBody}>
                <span className={styles.heroDirectoryLabel}>{item.label}</span>
                {item.meta ? <span className={styles.heroDirectoryMeta}>{item.meta}</span> : null}
              </span>
              <span className={styles.heroDirectoryArrow} aria-hidden="true">
                {isAnchor ? "↓" : "→"}
              </span>
            </>
          );

          return (
            <li key={`${item.href}-${item.label}`} className={styles.heroDirectoryItem}>
              {item.external ? (
                <a href={item.href} className={styles.heroDirectoryLink}>
                  {content}
                </a>
              ) : isAnchor ? (
                <a href={item.href} className={styles.heroDirectoryLink}>
                  {content}
                </a>
              ) : (
                <Link href={item.href} className={styles.heroDirectoryLink}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
