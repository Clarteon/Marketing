"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { FrontMatter } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import styles from "./pages.module.css";

interface WorkShowcaseProps {
  items: FrontMatter[];
}

const filters = [
  { id: "all", label: "All systems" },
  { id: "operations", label: "Orders, stock & payments" },
  { id: "conversations", label: "Customer support & AI coaching" },
  { id: "software", label: "Private on-device tools" },
] as const;

type FilterId = (typeof filters)[number]["id"];

export function WorkShowcase({ items }: WorkShowcaseProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const visibleItems =
    activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter);

  return (
    <div className={styles.workShowcase}>
      <div
        className={styles.workFilterBar}
        role="group"
        aria-label="Filter case studies by problem area"
      >
        <span className={styles.workFilterLabel}>Filter by problem area</span>
        <div className={styles.workFilterControls}>
          {filters.map((filter) => {
            const count =
              filter.id === "all"
                ? items.length
                : items.filter((item) => item.category === filter.id).length;

            return (
              <button
                key={filter.id}
                type="button"
                className={
                  activeFilter === filter.id
                    ? `${styles.workFilterButton} ${styles.workFilterButtonActive}`
                    : styles.workFilterButton
                }
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                <span>{filter.label}</span>
                <span className={styles.workFilterCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className={styles.workLedger}>
        {visibleItems.map((item, index) => {
          const entryNumber = String(item.order ?? index + 1).padStart(2, "0");

          return (
            <li key={item.slug} className={styles.workEntry}>
              <article className={styles.workArticle}>
                <div className={styles.workMetaBar}>
                  <div className={styles.workMetaLeft}>
                    <span className={styles.workIndex}>{entryNumber}</span>
                    {item.categoryLabel ? (
                      <span className={styles.workCategoryTag}>{item.categoryLabel}</span>
                    ) : null}
                    {item.client ? (
                      <span className={styles.workClientLabel}>{item.client}</span>
                    ) : null}
                  </div>
                  {item.solution_type ? (
                    <span className={styles.workSolutionType}>{item.solution_type}</span>
                  ) : null}
                </div>

                <div className={styles.workLeadGrid}>
                  <div className={styles.workTitleBlock}>
                    <h3 className={styles.workTitle}>
                      <Link className={styles.workTitleLink} href={`/our-work/${item.slug}`}>
                        {item.title}
                      </Link>
                    </h3>
                    <p className={styles.workSummary}>{item.summary}</p>

                    {item.highlights && item.highlights.length > 0 ? (
                      <ul className={styles.workHighlights} aria-label="Key project outcomes">
                        {item.highlights.map((highlight) => (
                          <li key={highlight} className={styles.workHighlightItem}>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className={styles.workActions}>
                      <Button href={`/our-work/${item.slug}`} variant="primary">
                        Read full case study
                      </Button>
                      {item.liveUrl ? (
                        <a
                          href={item.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.workExternalLink}
                        >
                          Inspect live system
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {item.image ? (
                    <div className={styles.workPreviewColumn}>
                      <Link
                        href={`/our-work/${item.slug}`}
                        className={styles.workImageLink}
                        aria-label={`View full case study for ${item.title}`}
                      >
                        <div className={styles.workImageFrame}>
                          <Image
                            src={item.image}
                            alt={item.imageAlt ?? item.title}
                            width={1440}
                            height={750}
                            sizes="(max-width: 960px) 100vw, 52vw"
                            className={styles.workImage}
                          />
                        </div>
                      </Link>
                      {item.secondaryImage ? (
                        <div className={styles.workSecondaryFrame}>
                          <Image
                            src={item.secondaryImage}
                            alt={item.secondaryImageAlt ?? `${item.title} automation workflow`}
                            width={1440}
                            height={688}
                            sizes="(max-width: 960px) 100vw, 52vw"
                            className={styles.workSecondaryImage}
                          />
                          <p className={styles.workCaption}>
                            Automated coaching report pipeline connected behind the voice session
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {item.problemBrief || item.approachBrief || item.outcomeBrief ? (
                  <dl className={styles.workBreakdown}>
                    {item.problemBrief ? (
                      <div className={styles.workBreakdownCell}>
                        <dt className={styles.workBreakdownTerm}>01 / The problem</dt>
                        <dd className={styles.workBreakdownDetail}>{item.problemBrief}</dd>
                      </div>
                    ) : null}
                    {item.approachBrief ? (
                      <div className={styles.workBreakdownCell}>
                        <dt className={styles.workBreakdownTerm}>02 / What we built</dt>
                        <dd className={styles.workBreakdownDetail}>{item.approachBrief}</dd>
                      </div>
                    ) : null}
                    {item.outcomeBrief ? (
                      <div className={styles.workBreakdownCell}>
                        <dt className={styles.workBreakdownTerm}>03 / What changed</dt>
                        <dd className={styles.workBreakdownDetail}>{item.outcomeBrief}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
