"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ContentPage } from "@/lib/content";
import { cx } from "@/lib/cx";
import { formatReadingTime } from "@/lib/reading-time";
import { DEFAULT_TEAM_MEMBERS, type TeamMember } from "@/lib/team";
import { AuthorBadge } from "./AuthorBadge";
import { EditorialArticleBody, formatInsightDate, formatTopicTag } from "./EditorialArticleBody";
import { useScrollProgressBar } from "./useScrollProgressBar";
import styles from "./pages.module.css";

interface InsightsCatalogProps {
  items: ContentPage[];
  team?: readonly TeamMember[];
}

export function InsightsCatalog({ items, team = DEFAULT_TEAM_MEMBERS }: InsightsCatalogProps) {
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

  const activeArticle = useMemo(
    () =>
      activeSlug ? (items.find((item) => item.frontMatter.slug === activeSlug) ?? null) : null,
    [activeSlug, items],
  );

  const updateUrlParam = useCallback((slug: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("article", slug);
    } else {
      url.searchParams.delete("article");
    }
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const openArticle = useCallback(
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

  const closeArticle = useCallback(() => {
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
    const initial = params.get("article");
    if (initial && items.some((item) => item.frontMatter.slug === initial)) {
      window.requestAnimationFrame(() => setActiveSlug(initial));
    }
  }, [items]);

  useEffect(() => {
    if (!activeArticle || isClosing) return;
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
        closeArticle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeArticle, isClosing, closeArticle, resetProgress]);

  function handleCardLinkClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    openArticle(slug, event.currentTarget);
  }

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <>
      <div className={styles.insightsCollection}>
        {featured ? (
          <InsightArticleCard
            item={featured}
            team={team}
            featured
            onLinkClick={handleCardLinkClick}
            onButtonClick={openArticle}
          />
        ) : null}

        {rest.length > 0 ? (
          <div className={styles.insightsGrid}>
            {rest.map((item) => (
              <InsightArticleCard
                key={item.frontMatter.slug}
                item={item}
                team={team}
                onLinkClick={handleCardLinkClick}
                onButtonClick={openArticle}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeArticle && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.articleModalBackdrop}
              data-state={isClosing ? "closed" : "open"}
              aria-hidden={isClosing ? "true" : undefined}
              role={isClosing ? undefined : "presentation"}
              onClick={(event) => {
                if (!isClosing && event.target === event.currentTarget) closeArticle();
              }}
            >
              <div
                ref={dialogRef}
                className={styles.articleModalPanel}
                data-state={isClosing ? "closed" : "open"}
                role={isClosing ? undefined : "dialog"}
                aria-modal={isClosing ? undefined : "true"}
                aria-labelledby={isClosing ? undefined : "modal-article-title"}
                tabIndex={-1}
              >
                <div className={styles.articleModalBar}>
                  <div
                    ref={progressBarRef}
                    className={styles.articleModalProgressTrack}
                    role="progressbar"
                    aria-label="Article reading progress"
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
                      onClick={closeArticle}
                    >
                      <span aria-hidden="true">←</span> Back to Insights
                    </button>

                    <div className={styles.articleModalBarRight}>
                      <span className={styles.articleModalReadPill}>
                        {formatReadingTime(activeArticle.body)}
                      </span>
                      <button
                        type="button"
                        className={styles.articleModalCloseBtn}
                        onClick={closeArticle}
                        aria-label="Close article"
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
                    <EditorialArticleBody
                      page={activeArticle}
                      team={team}
                      headingAs="h2"
                      titleId="modal-article-title"
                      onBack={closeArticle}
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

interface InsightArticleCardProps {
  item: ContentPage;
  team: readonly TeamMember[];
  featured?: boolean;
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>, slug: string) => void;
  onButtonClick: (slug: string, trigger?: HTMLElement | null) => void;
}

function InsightArticleCard({
  item,
  team,
  featured = false,
  onLinkClick,
  onButtonClick,
}: InsightArticleCardProps) {
  const { frontMatter } = item;
  const formattedDate = formatInsightDate(frontMatter.publishedAt);
  const readingTime = formatReadingTime(item.body);
  const previewTags = frontMatter.tags.slice(0, 3);
  const articleHref = `/insights/${frontMatter.slug}`;

  return (
    <article
      id={`insight-${frontMatter.slug}`}
      className={cx(styles.insightCard, featured && styles.insightCardFeatured)}
    >
      {frontMatter.image ? (
        <Link
          href={articleHref}
          onClick={(event) => onLinkClick(event, frontMatter.slug)}
          className={styles.insightCardMediaLink}
          tabIndex={-1}
        >
          {frontMatter.image.startsWith("/") ? (
            <Image
              src={frontMatter.image}
              alt={frontMatter.imageAlt ?? frontMatter.title}
              width={featured ? 1200 : 900}
              height={featured ? 750 : 562}
              priority={featured}
              sizes={featured ? "(max-width: 900px) 100vw, 48vw" : "(max-width: 900px) 100vw, 44vw"}
              className={styles.insightCardImage}
            />
          ) : (
            <img
              src={frontMatter.image}
              alt={frontMatter.imageAlt ?? frontMatter.title}
              className={styles.insightCardImage}
              loading={featured ? "eager" : "lazy"}
              decoding="async"
            />
          )}
        </Link>
      ) : null}

      <div className={styles.insightCardContent}>
        <div className={styles.insightCardTopMeta}>
          {formattedDate ? (
            <time className={styles.insightPublishDate} dateTime={frontMatter.publishedAt}>
              {formattedDate}
            </time>
          ) : (
            <span className={styles.insightPublishDate}>Article</span>
          )}
          <span className={styles.insightReadBadge}>{readingTime}</span>
        </div>

        <h3
          className={cx(styles.insightCardHeading, featured && styles.insightCardHeadingFeatured)}
        >
          <Link href={articleHref} onClick={(event) => onLinkClick(event, frontMatter.slug)}>
            {frontMatter.title}
          </Link>
        </h3>

        <p className={styles.insightCardSummary}>{frontMatter.summary}</p>

        {previewTags.length > 0 ? (
          <ul className={styles.insightTagList} aria-label="Article topics">
            {previewTags.map((tag) => (
              <li key={tag} className={styles.insightTopicPill}>
                {formatTopicTag(tag)}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.insightCardFooter}>
          {frontMatter.author ? (
            <div className={styles.insightAuthorCluster}>
              <AuthorBadge
                name={frontMatter.author}
                team={team}
                className={styles.insightAuthorMonogram}
              />
              <div className={styles.insightAuthorMetaStack}>
                <span className={styles.insightAuthorName}>{frontMatter.author}</span>
                {frontMatter.authorRole ? (
                  <span className={styles.insightAuthorRole}>{frontMatter.authorRole}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={styles.insightReadAction}
            onClick={(event) => onButtonClick(frontMatter.slug, event.currentTarget)}
            aria-label={`Read article: ${frontMatter.title}`}
          >
            <span>Read article</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </article>
  );
}
