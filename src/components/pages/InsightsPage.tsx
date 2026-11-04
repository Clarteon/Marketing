import Link from "next/link";
import type { ContentPage } from "@/lib/content";
import type { ListPageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

interface InsightsPageProps {
  data: ListPageData;
  items: ContentPage[];
}

export function InsightsPage({ data, items }: InsightsPageProps) {
  return (
    <Page>
      <PageHero title={data.hero.title} intro={data.hero.intro} />

      <Section aria-labelledby="insights-title">
        <ScrollReveal variant="settle" className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Articles</p>
          <h2 id="insights-title" className={styles.sectionTitle}>
            {items.length > 0 ? "Insights" : data.empty.title}
          </h2>
          {items.length === 0 ? (
            <>
              <p className={styles.sectionIntro}>{data.empty.body}</p>
              <div className={styles.emptyActions}>
                <Button href="/solutions" variant="secondary">
                  See the solutions
                </Button>
              </div>
            </>
          ) : null}
        </ScrollReveal>

        {items.length > 0 ? (
          <ul className={styles.list}>
            {items.map((item) => (
              <ScrollReveal as="li" key={item.frontMatter.slug} variant="settle">
                <Card as="article" className={styles.listItem}>
                  <h3>
                    <Link className={styles.listLink} href={`/insights/${item.frontMatter.slug}`}>
                      {item.frontMatter.title}
                    </Link>
                  </h3>
                  <p className={styles.listSummary}>{item.frontMatter.summary}</p>
                </Card>
              </ScrollReveal>
            ))}
          </ul>
        ) : null}
      </Section>

      <BookingSection />
    </Page>
  );
}
