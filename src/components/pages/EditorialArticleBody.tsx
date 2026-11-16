import Image from "next/image";
import Link from "next/link";
import type { ContentPage } from "@/lib/content";
import { formatReadingTime } from "@/lib/reading-time";
import { DEFAULT_TEAM_MEMBERS, type TeamMember } from "@/lib/team";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { AuthorBadge } from "./AuthorBadge";
import styles from "./pages.module.css";

interface EditorialArticleBodyProps {
  page: ContentPage;
  team?: readonly TeamMember[];
  headingAs?: "h1" | "h2";
  titleId: string;
  onBack?: () => void;
  backHref?: string;
  showPermalink?: boolean;
}

export function formatInsightDate(dateIso?: string): string | null {
  if (!dateIso) return null;
  const parsed = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function getAuthorMonogram(name?: string): string {
  if (!name) return "CL";
  const teamMatch = DEFAULT_TEAM_MEMBERS.find(
    (member) => member.name.toLowerCase() === name.toLowerCase(),
  );
  if (teamMatch) return teamMatch.monogram;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function formatTopicTag(tag: string): string {
  const cleaned = tag.trim();
  if (!cleaned) return "";
  if (cleaned.toLowerCase().startsWith("ai ")) {
    return `AI ${cleaned.slice(3)}`;
  }
  if (cleaned.toLowerCase().startsWith("api ")) {
    return `API ${cleaned.slice(4)}`;
  }
  if (cleaned.toLowerCase() === "crm") return "CRM";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function EditorialArticleBody({
  page,
  team = DEFAULT_TEAM_MEMBERS,
  headingAs = "h1",
  titleId,
  onBack,
  backHref = "/insights",
  showPermalink = false,
}: EditorialArticleBodyProps) {
  const { frontMatter } = page;
  const Heading = headingAs;
  const Subheading = headingAs === "h1" ? "h2" : "h3";
  const formattedDate = formatInsightDate(frontMatter.publishedAt);
  const readingTime = formatReadingTime(page.body);
  const primaryTopic = frontMatter.tags[0] ? formatTopicTag(frontMatter.tags[0]) : "Insights";

  const inModal = Boolean(onBack);

  return (
    <article className={styles.editorialArticleSheet} id="article-doc-root">
      <header className={styles.editorialDocHeader}>
        <div className={styles.editorialDocTopRow}>
          {!inModal ? (
            <Link href={backHref} className={styles.editorialBackTrigger}>
              <span aria-hidden="true">←</span> Back to Insights
            </Link>
          ) : null}

          <div className={styles.editorialDocKickerGroup}>
            <span className={styles.editorialDocTopic}>{primaryTopic}</span>
            {!inModal ? <span className={styles.editorialDocReadTime}>{readingTime}</span> : null}
          </div>
        </div>

        <Heading id={titleId} className={styles.editorialDocTitle}>
          {frontMatter.title}
        </Heading>

        <p className={styles.editorialDocSummary}>{frontMatter.summary}</p>

        <div className={styles.editorialDocBylineBar}>
          <div className={styles.editorialAuthorIdentity}>
            <AuthorBadge
              name={frontMatter.author}
              team={team}
              className={styles.editorialAuthorMonogram}
            />
            <div className={styles.editorialAuthorText}>
              {frontMatter.author ? (
                <span className={styles.editorialAuthorNameText}>{frontMatter.author}</span>
              ) : null}
              {frontMatter.authorRole ? (
                <span className={styles.editorialAuthorRoleText}>{frontMatter.authorRole}</span>
              ) : null}
            </div>
          </div>

          {formattedDate ? (
            <time className={styles.editorialDocDate} dateTime={frontMatter.publishedAt}>
              Published {formattedDate}
            </time>
          ) : null}
        </div>
      </header>

      {frontMatter.image ? (
        <figure className={styles.editorialDocFigure}>
          <div className={styles.editorialDocImageFrame}>
            {frontMatter.image.startsWith("/") ? (
              <Image
                src={frontMatter.image}
                alt={frontMatter.imageAlt ?? frontMatter.title}
                width={1200}
                height={750}
                priority={!inModal}
                sizes="(max-width: 1100px) 100vw, 736px"
                className={styles.editorialDocImage}
              />
            ) : (
              <img
                src={frontMatter.image}
                alt={frontMatter.imageAlt ?? frontMatter.title}
                className={styles.editorialDocImage}
                decoding="async"
              />
            )}
          </div>
          {frontMatter.imageAlt ? (
            <figcaption className={styles.editorialDocCaption}>{frontMatter.imageAlt}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className={styles.editorialDocContent}>
        <Markdown>{page.body}</Markdown>
      </div>

      {frontMatter.tags.length > 0 ? (
        <ul className={styles.editorialDocTags} aria-label="Topics">
          {frontMatter.tags.map((tag) => (
            <li key={tag} className={styles.insightTopicPill}>
              {formatTopicTag(tag)}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className={styles.editorialDocEndCard}>
        <div className={styles.editorialDocEndCopy}>
          <Subheading className={styles.editorialDocEndHeading}>
            Facing an operational challenge like this?
          </Subheading>
          <p className={styles.editorialDocEndText}>
            Walk through the problem on a 30-minute discovery call and leave with a plain-language
            recommendation.
          </p>
        </div>
        <div className={styles.editorialDocEndActions}>
          <Button href="/contact#book">Book a free discovery call</Button>
          {!onBack ? (
            <Button href={backHref} variant="secondary">
              Browse all insights
            </Button>
          ) : null}
          {showPermalink ? (
            <Link href={`/insights/${frontMatter.slug}`} className={styles.editorialPermalink}>
              Open full article page
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
