import type { SimplePageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function PrivacyPage({ data, body }: { data: SimplePageData; body: string }) {
  return (
    <Page>
      <PageHero title={data.hero.title} intro={data.hero.intro} />
      <Section width="narrow">
        <ReadingProgress>
          <Markdown className={styles.legalProse}>{body}</Markdown>
        </ReadingProgress>
      </Section>
      <BookingSection />
    </Page>
  );
}
