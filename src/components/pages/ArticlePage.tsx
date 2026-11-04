import type { ContentPage } from "@/lib/content";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { Section } from "@/components/ui/Section";

interface ArticlePageProps {
  page: ContentPage;
}

export function ArticlePage({ page }: ArticlePageProps) {
  return (
    <Page>
      <PageHero title={page.frontMatter.title} intro={page.frontMatter.summary} />
      <Section width="narrow">
        <ReadingProgress>
          <Markdown>{page.body}</Markdown>
        </ReadingProgress>
      </Section>
      <BookingSection />
    </Page>
  );
}
