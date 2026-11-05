import Image from "next/image";
import Link from "next/link";
import type { ContentPage } from "@/lib/content";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

interface ArticlePageProps {
  page: ContentPage;
}

export function ArticlePage({ page }: ArticlePageProps) {
  const { frontMatter } = page;
  const isCaseStudy = frontMatter.type === "case-study";

  return (
    <Page>
      <PageHero title={frontMatter.title} intro={frontMatter.summary} />

      {isCaseStudy ? (
        <Section tone="stone" aria-labelledby="case-study-brief-title">
          <div className={styles.caseStudyDossier}>
            <div className={styles.caseStudyNavRow}>
              <Link href="/our-work" className={styles.caseStudyBackLink}>
                <span aria-hidden="true">←</span> Back to Our work
              </Link>
              <div className={styles.caseStudyBadges}>
                {frontMatter.categoryLabel ? (
                  <span className={styles.workCategoryTag}>{frontMatter.categoryLabel}</span>
                ) : null}
                {frontMatter.client ? (
                  <span className={styles.workClientLabel}>{frontMatter.client}</span>
                ) : null}
                {frontMatter.solution_type ? (
                  <span className={styles.workSolutionType}>{frontMatter.solution_type}</span>
                ) : null}
              </div>
            </div>

            <div className={styles.caseStudyHeaderRow}>
              <h2 id="case-study-brief-title" className={styles.caseStudyDossierTitle}>
                Project overview at a glance
              </h2>
              <div className={styles.caseStudyHeaderActions}>
                {frontMatter.liveUrl ? (
                  <a
                    href={frontMatter.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.workExternalLink}
                  >
                    Inspect live system <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
                <Button href="/contact#book" variant="secondary">
                  Discuss a similar problem
                </Button>
              </div>
            </div>

            {frontMatter.problemBrief || frontMatter.approachBrief || frontMatter.outcomeBrief ? (
              <dl className={styles.workBreakdown}>
                {frontMatter.problemBrief ? (
                  <div className={styles.workBreakdownCell}>
                    <dt className={styles.workBreakdownTerm}>01 / The problem</dt>
                    <dd className={styles.workBreakdownDetail}>{frontMatter.problemBrief}</dd>
                  </div>
                ) : null}
                {frontMatter.approachBrief ? (
                  <div className={styles.workBreakdownCell}>
                    <dt className={styles.workBreakdownTerm}>02 / What we built</dt>
                    <dd className={styles.workBreakdownDetail}>{frontMatter.approachBrief}</dd>
                  </div>
                ) : null}
                {frontMatter.outcomeBrief ? (
                  <div className={styles.workBreakdownCell}>
                    <dt className={styles.workBreakdownTerm}>03 / What changed</dt>
                    <dd className={styles.workBreakdownDetail}>{frontMatter.outcomeBrief}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {frontMatter.highlights && frontMatter.highlights.length > 0 ? (
              <ul className={styles.workHighlights} aria-label="Key outcomes">
                {frontMatter.highlights.map((highlight) => (
                  <li key={highlight} className={styles.workHighlightItem}>
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}

            {frontMatter.image ? (
              <div className={styles.caseStudyGallery}>
                <figure className={styles.caseStudyFigure}>
                  <div className={styles.workImageFrame}>
                    <Image
                      src={frontMatter.image}
                      alt={frontMatter.imageAlt ?? frontMatter.title}
                      width={1440}
                      height={750}
                      priority
                      sizes="(max-width: 1100px) 100vw, 1024px"
                      className={styles.workImage}
                    />
                  </div>
                  {frontMatter.imageAlt ? (
                    <figcaption className={styles.workCaption}>{frontMatter.imageAlt}</figcaption>
                  ) : null}
                </figure>

                {frontMatter.secondaryImage ? (
                  <figure className={styles.caseStudyFigure}>
                    <div className={styles.workImageFrame}>
                      <Image
                        src={frontMatter.secondaryImage}
                        alt={
                          frontMatter.secondaryImageAlt ??
                          `${frontMatter.title} automation workflow`
                        }
                        width={1440}
                        height={688}
                        sizes="(max-width: 1100px) 100vw, 1024px"
                        className={styles.workImage}
                      />
                    </div>
                    {frontMatter.secondaryImageAlt ? (
                      <figcaption className={styles.workCaption}>
                        {frontMatter.secondaryImageAlt}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section width="narrow">
        <ReadingProgress>
          <Markdown>{page.body}</Markdown>
        </ReadingProgress>
      </Section>

      <BookingSection />
    </Page>
  );
}
