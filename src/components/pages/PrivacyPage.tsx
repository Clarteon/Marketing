import type { SimplePageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";

export function PrivacyPage({ data, body }: { data: SimplePageData; body: string }) {
  return (
    <Page>
      <PageHero eyebrow={data.hero.eyebrow} title={data.hero.title} intro={data.hero.intro} />
      <Section width="narrow">
        <Markdown>{body}</Markdown>
      </Section>
      <BookingSection />
    </Page>
  );
}
