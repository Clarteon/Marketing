import Image from "next/image";
import type { SolutionsData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ScrollReveal, type ScrollRevealVariant } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import { SolutionMarquee } from "@/components/ui/SolutionMarquee";
import styles from "./pages.module.css";

const themeEntrances: ScrollRevealVariant[] = ["slide", "wipe", "settle", "rise", "focus"];

const problemMedia: Record<string, { src: string; alt: string }> = {
  "Repeated data entry": {
    src: "/images/editorial/sol-data-entry.jpg",
    alt: "Person entering records across spreadsheets and business tools on a wooden desk",
  },
  "Spreadsheets as software": {
    src: "/images/editorial/sol-spreadsheets.jpg",
    alt: "Laptop open to a multi-column business spreadsheet beside a pen and notebook",
  },
  "Approvals that wait": {
    src: "/images/editorial/sol-approvals.webp",
    alt: "Closed notebook, pen, phone, and espresso waiting on a quiet timber table",
  },
  "The same questions": {
    src: "/images/editorial/sol-same-questions.webp",
    alt: "Typing responses on a laptop keyboard next to a mobile phone and printed notes",
  },
  "Leads that go cold": {
    src: "/images/editorial/sol-leads-cold.jpg",
    alt: "Idle smartphone resting beside a laptop computer and espresso cup",
  },
  "Handoffs that lose context": {
    src: "/images/editorial/sol-handoffs.jpg",
    alt: "Two teammates sitting across a table to keep client handoff notes aligned",
  },
  "Tools that do not talk": {
    src: "/images/editorial/sol-tools-apart.jpg",
    alt: "Two separate computer displays standing side by side on a clean studio desk",
  },
  "Reporting that eats a day": {
    src: "/images/editorial/sol-reporting.jpg",
    alt: "Close-up of a laptop screen displaying live activity trends and performance charts",
  },
  "Reports no one trusts": {
    src: "/images/editorial/sol-reports-trust.webp",
    alt: "Laptop display showing chart figures beside an idle phone on a bright desk",
  },
  "Visitors cannot find the answer": {
    src: "/images/editorial/sol-site-clarity.webp",
    alt: "Laptop resting next to hand-drawn webpage wireframe sketches in an open notebook",
  },
  "Interest does not become a conversation": {
    src: "/images/editorial/sol-traffic-booking.jpg",
    alt: "Open weekly booking calendar planner laid out beside a laptop and smartphone",
  },
  "Updates need a developer": {
    src: "/images/editorial/sol-content-updates.jpg",
    alt: "Laptop displaying structured web template code next to a black ceramic mug",
  },
};

function getThemeLayoutClass(index: number) {
  switch (index % 4) {
    case 0:
      return styles.solutionLayoutSplitStack;
    case 1:
      return styles.solutionLayoutTriptych;
    case 2:
      return styles.solutionLayoutBannerDual;
    default:
      return styles.solutionLayoutDualClosing;
  }
}

export function SolutionsPage({ data }: { data: SolutionsData }) {
  return (
    <Page>
      <PageHero
        tone="paper"
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <Button href="/contact#book" size="large">
            Book a free discovery call
          </Button>
        }
        bottomBand={<SolutionMarquee />}
      />

      {data.themes.map((theme, index) => {
        const sectionTone = index % 2 === 1 ? "stone" : "paper";
        const layoutClass = getThemeLayoutClass(index);

        return (
          <Section
            key={theme.id}
            id={theme.id}
            tone={sectionTone}
            aria-labelledby={`${theme.id}-title`}
          >
            {index === 0 ? (
              <nav aria-label="Problem areas" className={styles.solutionsJumpBar}>
                {data.themes.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={styles.solutionsJumpLink}>
                    {item.title}
                  </a>
                ))}
              </nav>
            ) : null}

            <ScrollReveal
              variant={themeEntrances[index % themeEntrances.length]}
              className={styles.solutionThemeHeader}
            >
              <div className={styles.solutionThemeTitleCol}>
                <h2 id={`${theme.id}-title`} className={styles.sectionTitle}>
                  {theme.title}
                </h2>
              </div>

              <div className={styles.solutionThemeMetaCol}>
                <p className={styles.sectionIntro}>{theme.intro}</p>
                <div className={styles.solutionThemeAction}>
                  <Button href="/contact#book" variant="secondary">
                    Talk through this problem
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal
              stagger
              variant={themeEntrances[index % themeEntrances.length]}
              className={cx(styles.solutionThemeLayout, layoutClass)}
            >
              {theme.problems.map((problem, problemIndex) => {
                const media = problemMedia[problem.title];
                const approaches = problem.solution
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <article
                    key={problem.title}
                    className={cx(
                      styles.solutionFeatureCard,
                      problemIndex === 0 && styles.solutionFeaturePrimary,
                      problemIndex === 2 && styles.solutionFeatureClosing,
                    )}
                  >
                    {media ? (
                      <div className={styles.solutionMediaWrap}>
                        <Image
                          src={media.src}
                          alt={media.alt}
                          fill
                          loading={index === 0 ? "eager" : undefined}
                          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 48vw"
                          className={styles.solutionMediaImg}
                        />
                      </div>
                    ) : null}
                    <div className={styles.solutionCardContent}>
                      <h3 className={cx(styles.problemTitle, styles.solutionCardTitle)}>
                        {problem.title}
                      </h3>
                      <p className={styles.problemBody}>{problem.body}</p>
                      <p className={styles.solutionApproachLine}>
                        <span className={styles.solutionApproachPrefix}>Often solved with</span>{" "}
                        <span className={styles.solutionApproachList}>{approaches}</span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </ScrollReveal>
          </Section>
        );
      })}

      <ScrollReveal>
        <BookingSection />
      </ScrollReveal>
    </Page>
  );
}
