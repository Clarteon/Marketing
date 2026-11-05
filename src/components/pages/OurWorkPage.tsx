import type { ContentPage } from "@/lib/content";
import type { ListPageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import { WorkShowcase } from "./WorkShowcase";
import styles from "./pages.module.css";

interface OurWorkPageProps {
  data: ListPageData;
  body: string;
  items: ContentPage[];
}

export function OurWorkPage({ data, body, items }: OurWorkPageProps) {
  return (
    <Page>
      <PageHero title={data.hero.title} intro={data.hero.intro} />

      <Section aria-labelledby="work-title">
        <ScrollReveal variant="wipe" className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Case studies & reference builds</p>
          <h2 id="work-title" className={styles.sectionTitle}>
            {items.length > 0 ? "Start with the problem. Inspect the system." : data.empty.title}
          </h2>
          {items.length > 0 ? (
            <p className={styles.sectionIntro}>
              Each entry below documents a real operational bottleneck, the automation or custom
              software we put in place, and how daily work changed afterward.
            </p>
          ) : (
            <>
              <p className={styles.sectionIntro}>{data.empty.body}</p>
              <div className={styles.emptyActions}>
                <Button href="/contact#brief" variant="secondary">
                  Tell us about your problem
                </Button>
              </div>
            </>
          )}
        </ScrollReveal>

        {items.length > 0 ? <WorkShowcase items={items.map((item) => item.frontMatter)} /> : null}
      </Section>

      {body.trim() ? (
        <Section tone="stone">
          <Markdown reveal>{body}</Markdown>
        </Section>
      ) : null}

      <BookingSection />
    </Page>
  );
}
