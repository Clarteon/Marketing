import Image from "next/image";
import Link from "next/link";
import type { ContentPage } from "@/lib/content";
import type { ListPageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
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
        {items.length === 0 ? (
          <div className={styles.insightsEmptyGrid}>
            <ScrollReveal variant="settle" className={styles.insightsEmptyIntro}>
              <h2 id="insights-title" className={styles.sectionTitle}>
                {data.empty.title}
              </h2>
              <p className={styles.sectionIntro}>{data.empty.body}</p>
              <div className={styles.emptyActions}>
                <Button href="/solutions" variant="primary">
                  See the solutions
                </Button>
                <Button href="/contact#book" variant="secondary">
                  Book a discovery call
                </Button>
              </div>
              <ul className={styles.editorialLinkList} aria-label="Related areas">
                <li>
                  <Link href="/solutions#operations" className={styles.editorialTextLink}>
                    Operations and repetitive admin
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#conversations" className={styles.editorialTextLink}>
                    Customer support and triage
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#software" className={styles.editorialTextLink}>
                    Disconnected tools and data
                  </Link>
                </li>
                <li>
                  <Link href="/our-work" className={styles.editorialTextLink}>
                    Sample system architectures
                  </Link>
                </li>
              </ul>
            </ScrollReveal>

            <ScrollReveal variant="rise" className={styles.insightsVisualFrame}>
              <Image
                src="/images/editorial/insights-notes.webp"
                alt="Open editorial notebook with sketched interface plans and a pen on a desk"
                width={1024}
                height={768}
                sizes="(max-width: 960px) 100vw, 44vw"
                className={styles.editorialPhoto}
              />
            </ScrollReveal>
          </div>
        ) : (
          <>
            <ScrollReveal variant="settle" className={styles.sectionHeader}>
              <h2 id="insights-title" className={styles.sectionTitle}>
                Insights
              </h2>
            </ScrollReveal>

            <ul className={styles.editorialArticleList}>
              {items.map((item) => (
                <ScrollReveal as="li" key={item.frontMatter.slug} variant="settle">
                  <article className={styles.editorialArticleEntry}>
                    <h3>
                      <Link className={styles.listLink} href={`/insights/${item.frontMatter.slug}`}>
                        {item.frontMatter.title}
                      </Link>
                    </h3>
                    <p className={styles.listSummary}>{item.frontMatter.summary}</p>
                  </article>
                </ScrollReveal>
              ))}
            </ul>
          </>
        )}
      </Section>

      <BookingSection />
    </Page>
  );
}
