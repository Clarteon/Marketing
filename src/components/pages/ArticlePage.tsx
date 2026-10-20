import type { ContentPage } from "@/lib/content";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";

interface ArticlePageProps {
  page: ContentPage;
  eyebrow: string;
}

export function ArticlePage({ page, eyebrow }: ArticlePageProps) {
  return (
    <Page>
      <PageHero eyebrow={eyebrow} title={page.frontMatter.title} intro={page.frontMatter.summary} />
      <Section width="narrow">
        <Markdown>{page.body}</Markdown>
      </Section>
      <BookingSection />
    </Page>
  );
}
