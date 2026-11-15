import Image from "next/image";
import Link from "next/link";
import type { ContentPage, FrontMatter } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { formatInsightDate } from "./EditorialArticleBody";
import styles from "./pages.module.css";

interface CaseStudyBodyProps {
  page: ContentPage | { frontMatter: FrontMatter; body?: string };
  headingAs?: "h1" | "h2";
  titleId?: string;
  backHref?: string;
  showBackLink?: boolean;
  showPermalink?: boolean;
}

export function CaseStudyBody({
  page,
  headingAs = "h1",
  titleId,
  backHref = "/our-work",
  showBackLink = true,
  showPermalink = false,
}: CaseStudyBodyProps) {
  const { frontMatter } = page;
  const Heading = headingAs;
  const Subheading = headingAs === "h1" ? "h2" : "h3";
  const formattedDate = formatInsightDate(frontMatter.publishedAt);
  const hasBreakdown = Boolean(
    frontMatter.problemBrief || frontMatter.approachBrief || frontMatter.outcomeBrief,
  );
  const body = "body" in page ? (page.body ?? "") : "";

  return (
    <article className={styles.editorialArticleSheet} id="case-study-doc-root">
      <header className={styles.editorialDocHeader}>
        <div className={styles.editorialDocTopRow}>
          {showBackLink ? (
            <Link href={backHref} className={styles.editorialBackTrigger}>
              <span aria-hidden="true">←</span> Back to Our work
            </Link>
          ) : null}

          <div className={styles.editorialDocKickerGroup}>
            {frontMatter.categoryLabel ? (
              <span className={styles.editorialDocTopic}>{frontMatter.categoryLabel}</span>
            ) : null}
            {frontMatter.solution_type ? (
              <span className={styles.caseStudyTypeTag}>{frontMatter.solution_type}</span>
            ) : null}
          </div>
        </div>

        <Heading id={titleId} className={styles.editorialDocTitle}>
          {frontMatter.title}
        </Heading>

        <p className={styles.editorialDocSummary}>{frontMatter.summary}</p>

        <div className={styles.editorialDocBylineBar}>
          <div className={styles.caseStudyClientStack}>
            {frontMatter.client ? (
              <span className={styles.editorialAuthorNameText}>{frontMatter.client}</span>
            ) : null}
            {formattedDate ? (
              <time className={styles.editorialDocDate} dateTime={frontMatter.publishedAt}>
                Documented {formattedDate}
              </time>
            ) : null}
          </div>

          <div className={styles.caseStudyHeaderActions}>
            {frontMatter.liveUrl ? (
              <a
                href={frontMatter.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.workExternalLink}
              >
                Inspect live system
              </a>
            ) : null}
            <Button href="/contact#book" variant="secondary">
              Discuss a similar problem
            </Button>
          </div>
        </div>
      </header>

      {hasBreakdown ? (
        <dl className={styles.caseStudyBreakdown}>
          {frontMatter.problemBrief ? (
            <div className={styles.caseStudyBreakdownCell}>
              <dt className={styles.workBreakdownTerm}>The problem</dt>
              <dd className={styles.workBreakdownDetail}>{frontMatter.problemBrief}</dd>
            </div>
          ) : null}
          {frontMatter.approachBrief ? (
            <div className={styles.caseStudyBreakdownCell}>
              <dt className={styles.workBreakdownTerm}>What we built</dt>
              <dd className={styles.workBreakdownDetail}>{frontMatter.approachBrief}</dd>
            </div>
          ) : null}
          {frontMatter.outcomeBrief ? (
            <div className={styles.caseStudyBreakdownCell}>
              <dt className={styles.workBreakdownTerm}>What changed</dt>
              <dd className={styles.workBreakdownDetail}>{frontMatter.outcomeBrief}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {frontMatter.highlights && frontMatter.highlights.length > 0 ? (
        <section className={styles.caseStudyOutcomesBlock} aria-label="Key outcomes">
          <Subheading className={styles.caseStudySubheading}>Key project outcomes</Subheading>
          <ul className={styles.workHighlights}>
            {frontMatter.highlights.map((highlight) => (
              <li key={highlight} className={styles.workHighlightItem}>
                {highlight}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {frontMatter.image ? (
        <div className={styles.caseStudyGallery}>
          <figure className={styles.editorialDocFigure}>
            <div className={styles.editorialDocImageFrame}>
              {frontMatter.image.startsWith("/") ? (
                <Image
                  src={frontMatter.image}
                  alt={frontMatter.imageAlt ?? frontMatter.title}
                  width={1440}
                  height={750}
                  priority={showBackLink}
                  sizes="(max-width: 1100px) 100vw, 880px"
                  className={styles.editorialDocImage}
                />
              ) : (
                <img
                  src={frontMatter.image}
                  alt={frontMatter.imageAlt ?? frontMatter.title}
                  loading="lazy"
                  className={styles.editorialDocImage}
                />
              )}
            </div>
            {frontMatter.imageAlt ? (
              <figcaption className={styles.editorialDocCaption}>{frontMatter.imageAlt}</figcaption>
            ) : null}
          </figure>

          {frontMatter.secondaryImage ? (
            <figure className={styles.editorialDocFigure}>
              <div className={styles.editorialDocImageFrame}>
                {frontMatter.secondaryImage.startsWith("/") ? (
                  <Image
                    src={frontMatter.secondaryImage}
                    alt={
                      frontMatter.secondaryImageAlt ?? `${frontMatter.title} automation workflow`
                    }
                    width={1440}
                    height={688}
                    sizes="(max-width: 1100px) 100vw, 880px"
                    className={styles.editorialDocImage}
                  />
                ) : (
                  <img
                    src={frontMatter.secondaryImage}
                    alt={
                      frontMatter.secondaryImageAlt ?? `${frontMatter.title} automation workflow`
                    }
                    loading="lazy"
                    className={styles.editorialDocImage}
                  />
                )}
              </div>
              {frontMatter.secondaryImageAlt ? (
                <figcaption className={styles.editorialDocCaption}>
                  {frontMatter.secondaryImageAlt}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>
      ) : null}

      {body.trim() ? (
        <div className={styles.editorialDocContent}>
          <Markdown>{body}</Markdown>
        </div>
      ) : null}

      {frontMatter.tags.length > 0 ? (
        <ul className={styles.editorialDocTags} aria-label="Systems and capabilities">
          {frontMatter.tags.map((tag) => (
            <li key={tag} className={styles.insightTopicPill}>
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className={styles.editorialDocEndCard}>
        <div className={styles.editorialDocEndCopy}>
          <Subheading className={styles.editorialDocEndHeading}>
            Working through a similar operational challenge?
          </Subheading>
          <p className={styles.editorialDocEndText}>
            Walk through the manual steps slowing your team down on a 30-minute discovery call and
            leave with a practical recommendation.
          </p>
        </div>
        <div className={styles.editorialDocEndActions}>
          <Button href="/contact#book">Book a free discovery call</Button>
          {showBackLink ? (
            <Button href={backHref} variant="secondary">
              Browse all case studies
            </Button>
          ) : null}
          {showPermalink ? (
            <Link href={`/our-work/${frontMatter.slug}`} className={styles.editorialPermalink}>
              Open full case study page
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
