"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ContentPage, FrontMatter } from "@/lib/content";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/Button";
import { CaseStudyBody } from "./CaseStudyBody";
import { useScrollProgressBar } from "./useScrollProgressBar";
import styles from "./pages.module.css";

type WorkEntryItem = ContentPage | FrontMatter;

interface WorkShowcaseProps {
  items: WorkEntryItem[];
}

const baseFilters = [
  { id: "all", label: "All systems" },
  { id: "operations", label: "Orders, stock & payments" },
  { id: "conversations", label: "Customer support & AI coaching" },
  { id: "software", label: "Private on-device tools" },
] as const;

type FilterId = "all" | "operations" | "conversations" | "software" | "web";

function isContentPage(entry: WorkEntryItem): entry is ContentPage {
  return (
    "frontMatter" in entry && typeof entry.frontMatter === "object" && entry.frontMatter !== null
  );
}

function normalizeWorkEntry(entry: WorkEntryItem): ContentPage {
  if (isContentPage(entry)) {
    return entry;
  }
  return {
    frontMatter: entry,
    body: "",
    filePath: "",
  };
}

export function WorkShowcase({ items }: WorkShowcaseProps) {
  const entries = useMemo(() => items.map(normalizeWorkEntry), [items]);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const {
    progressBarRef,
    progressFillRef,
    handleScroll: handleModalScroll,
    resetProgress,
  } = useScrollProgressBar(scrollBodyRef);

  const hasWebProjects = entries.some((entry) => entry.frontMatter.category === "web");
  const filters: readonly { id: FilterId; label: string }[] = hasWebProjects
    ? [...baseFilters, { id: "web", label: "Websites & web apps" }]
    : baseFilters;

  const visibleEntries =
    activeFilter === "all"
      ? entries
      : entries.filter((entry) => entry.frontMatter.category === activeFilter);

  const activeProject = useMemo(
    () =>
      activeSlug ? (entries.find((entry) => entry.frontMatter.slug === activeSlug) ?? null) : null,
    [activeSlug, entries],
  );

  const updateUrlParam = useCallback((slug: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("project", slug);
    } else {
      url.searchParams.delete("project");
    }
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const openProject = useCallback(
    (slug: string, trigger?: HTMLElement | null) => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (trigger) {
        returnFocusRef.current = trigger;
      } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        returnFocusRef.current = document.activeElement;
      }
      setIsClosing(false);
      resetProgress();
      setActiveSlug(slug);
      updateUrlParam(slug);
    },
    [resetProgress, updateUrlParam],
  );

  const closeProject = useCallback(() => {
    updateUrlParam(null);
    window.requestAnimationFrame(() => {
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    });

    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsClosing(false);
      setActiveSlug(null);
      return;
    }

    setIsClosing(true);
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      setIsClosing(false);
      setActiveSlug(null);
    }, 170);
  }, [updateUrlParam]);

  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("project");
    if (initial && entries.some((entry) => entry.frontMatter.slug === initial)) {
      window.requestAnimationFrame(() => setActiveSlug(initial));
    }
  }, [entries]);

  useEffect(() => {
    if (!activeProject || isClosing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTop = 0;
      }
      resetProgress();
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProject, isClosing, closeProject, resetProgress]);

  function handleProjectLinkClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    openProject(slug, event.currentTarget);
  }

  return (
    <>
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
                  ? entries.length
                  : entries.filter((entry) => entry.frontMatter.category === filter.id).length;

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
          {visibleEntries.map((entry, index) => {
            const item = entry.frontMatter;
            return (
              <li key={item.slug} id={`work-${item.slug}`} className={styles.workEntry}>
                <article className={styles.workArticle}>
                  <div className={styles.workMetaBar}>
                    <div className={styles.workMetaLeft}>
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
                        <Link
                          className={styles.workTitleLink}
                          href={`/our-work/${item.slug}`}
                          onClick={(event) => handleProjectLinkClick(event, item.slug)}
                        >
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
                        <Button
                          href={`/our-work/${item.slug}`}
                          variant="primary"
                          onClick={(event) => handleProjectLinkClick(event, item.slug)}
                        >
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
                          onClick={(event) => handleProjectLinkClick(event, item.slug)}
                        >
                          <div className={cx(styles.workImageFrame, styles.photoRevealFrame)}>
                            {item.image.startsWith("/") ? (
                              <Image
                                src={item.image}
                                alt={item.imageAlt ?? item.title}
                                width={1440}
                                height={750}
                                priority={index === 0}
                                sizes="(max-width: 960px) 100vw, 52vw"
                                className={styles.workImage}
                              />
                            ) : (
                              <img
                                src={item.image}
                                alt={item.imageAlt ?? item.title}
                                loading="lazy"
                                className={styles.workImage}
                              />
                            )}
                          </div>
                        </Link>
                        {item.secondaryImage ? (
                          <div className={cx(styles.workSecondaryFrame, styles.photoRevealFrame)}>
                            {item.secondaryImage.startsWith("/") ? (
                              <Image
                                src={item.secondaryImage}
                                alt={item.secondaryImageAlt ?? `${item.title} automation workflow`}
                                width={1440}
                                height={688}
                                sizes="(max-width: 960px) 100vw, 52vw"
                                className={styles.workSecondaryImage}
                              />
                            ) : (
                              <img
                                src={item.secondaryImage}
                                alt={item.secondaryImageAlt ?? `${item.title} automation workflow`}
                                loading="lazy"
                                className={styles.workSecondaryImage}
                              />
                            )}
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
                          <dt className={styles.workBreakdownTerm}>The problem</dt>
                          <dd className={styles.workBreakdownDetail}>{item.problemBrief}</dd>
                        </div>
                      ) : null}
                      {item.approachBrief ? (
                        <div className={styles.workBreakdownCell}>
                          <dt className={styles.workBreakdownTerm}>What we built</dt>
                          <dd className={styles.workBreakdownDetail}>{item.approachBrief}</dd>
                        </div>
                      ) : null}
                      {item.outcomeBrief ? (
                        <div className={styles.workBreakdownCell}>
                          <dt className={styles.workBreakdownTerm}>What changed</dt>
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

      {activeProject && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.articleModalBackdrop}
              data-state={isClosing ? "closed" : "open"}
              aria-hidden={isClosing ? "true" : undefined}
              role={isClosing ? undefined : "presentation"}
              onClick={(event) => {
                if (!isClosing && event.target === event.currentTarget) closeProject();
              }}
            >
              <div
                ref={dialogRef}
                className={styles.articleModalPanel}
                data-state={isClosing ? "closed" : "open"}
                role={isClosing ? undefined : "dialog"}
                aria-modal={isClosing ? undefined : "true"}
                aria-labelledby={isClosing ? undefined : "modal-case-study-title"}
                tabIndex={-1}
              >
                <div className={styles.articleModalBar}>
                  <div
                    ref={progressBarRef}
                    className={styles.articleModalProgressTrack}
                    role="progressbar"
                    aria-label="Case study reading progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={0}
                  >
                    <span ref={progressFillRef} className={styles.articleModalProgressFill} />
                  </div>

                  <div className={styles.articleModalBarInner}>
                    <button
                      type="button"
                      className={styles.articleModalBackBtn}
                      onClick={closeProject}
                    >
                      <span aria-hidden="true">←</span> Back to Our work
                    </button>

                    <div className={styles.articleModalBarRight}>
                      {activeProject.frontMatter.categoryLabel ? (
                        <span className={styles.articleModalReadPill}>
                          {activeProject.frontMatter.categoryLabel}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={styles.articleModalCloseBtn}
                        onClick={closeProject}
                        aria-label="Close case study"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  ref={scrollBodyRef}
                  className={styles.articleModalScroll}
                  onScroll={handleModalScroll}
                >
                  <div className={styles.articleModalBodyWrap}>
                    <CaseStudyBody
                      page={activeProject}
                      headingAs="h2"
                      titleId="modal-case-study-title"
                      showBackLink={false}
                      showPermalink
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
