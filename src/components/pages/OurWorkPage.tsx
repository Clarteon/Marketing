import Link from "next/link";
import type { ContentPage } from "@/lib/content";
import type { ListPageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

interface OurWorkPageProps {
  data: ListPageData;
  body: string;
  items: ContentPage[];
}

export function OurWorkPage({ data, body, items }: OurWorkPageProps) {
  return (
    <Page>
      <PageHero eyebrow={data.hero.eyebrow} title={data.hero.title} intro={data.hero.intro} />

      <Section aria-labelledby="work-title">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Case studies</p>
          <h2 id="work-title" className={styles.sectionTitle}>
            {items.length > 0 ? "Work you can look at." : data.empty.title}
          </h2>
          {items.length === 0 ? (
            <>
              <p className={styles.sectionIntro}>{data.empty.body}</p>
              <div className={styles.emptyActions}>
                <Button href="/contact#brief" variant="secondary">
                  Tell us about your problem
                </Button>
              </div>
            </>
          ) : null}
        </div>

        {items.length > 0 ? (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.frontMatter.slug}>
                <Card as="article" className={styles.listItem}>
                  <h3>
                    <Link className={styles.listLink} href={`/our-work/${item.frontMatter.slug}`}>
                      {item.frontMatter.title}
                    </Link>
                  </h3>
                  <p className={styles.listSummary}>{item.frontMatter.summary}</p>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {body.trim() ? (
        <Section tone="stone">
          <Markdown>{body}</Markdown>
        </Section>
      ) : null}

      <BookingSection />
    </Page>
  );
}
