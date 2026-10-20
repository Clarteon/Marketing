import type { SolutionsData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function SolutionsPage({ data }: { data: SolutionsData }) {
  return (
    <Page>
      <PageHero
        eyebrow={data.hero.eyebrow}
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <Button href="/contact#book" size="large">
            Book a free discovery call
          </Button>
        }
      />

      {data.themes.map((theme, index) => (
        <Section
          key={theme.id}
          id={theme.id}
          tone={index % 2 === 1 ? "stone" : "paper"}
          aria-labelledby={`${theme.id}-title`}
        >
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{String(index + 1).padStart(2, "0")}</p>
            <h2 id={`${theme.id}-title`} className={styles.sectionTitle}>
              {theme.title}
            </h2>
            <p className={styles.sectionIntro}>{theme.intro}</p>
          </div>

          <div className={styles.problemGrid}>
            {theme.problems.map((problem) => (
              <Card as="article" key={problem.title} className={styles.problemCard}>
                <h3 className={styles.problemTitle}>{problem.title}</h3>
                <p className={styles.problemBody}>{problem.body}</p>
                <p className={styles.solution}>
                  <span>Often solved with</span>
                  <span>{problem.solution}</span>
                </p>
              </Card>
            ))}
          </div>

          <div className={styles.themeAction}>
            <Button href="/contact#book" variant="text">
              Talk through this problem
            </Button>
          </div>
        </Section>
      ))}

      <BookingSection />
    </Page>
  );
}
