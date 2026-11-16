import type { ContentPage } from "@/lib/content";
import { DEFAULT_TEAM_MEMBERS, type TeamMember } from "@/lib/team";
import { BookingSection } from "@/components/ui/BookingSection";
import { Page } from "@/components/ui/Page";
import { Section } from "@/components/ui/Section";
import { ArticleReadingBar } from "./ArticleReadingBar";
import { CaseStudyBody } from "./CaseStudyBody";
import { EditorialArticleBody } from "./EditorialArticleBody";
import styles from "./pages.module.css";

interface ArticlePageProps {
  page: ContentPage;
  team?: TeamMember[];
}

export function ArticlePage({ page, team = DEFAULT_TEAM_MEMBERS }: ArticlePageProps) {
  const { frontMatter } = page;
  const isCaseStudy = frontMatter.type === "case-study";

  if (!isCaseStudy) {
    return (
      <Page>
        <ArticleReadingBar />
        <Section className={styles.editorialArticlePageSection}>
          <EditorialArticleBody
            page={page}
            team={team}
            headingAs="h1"
            titleId="article-title"
            backHref="/insights"
          />
        </Section>
        <BookingSection />
      </Page>
    );
  }

  return (
    <Page>
      <ArticleReadingBar />
      <Section className={styles.editorialArticlePageSection}>
        <CaseStudyBody
          page={page}
          headingAs="h1"
          titleId="case-study-title"
          backHref="/our-work"
          showBackLink
        />
      </Section>
      <BookingSection />
    </Page>
  );
}
