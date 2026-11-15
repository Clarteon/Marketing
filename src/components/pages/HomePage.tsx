import Link from "next/link";
import type { FeaturedHomeProject } from "@/lib/admin/projects";
import { DEFAULT_SITE_CONFIG, type SiteConfig } from "@/lib/admin/site-config-defaults";
import type { HomeData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroFlowVisualization } from "@/components/ui/HeroFlowVisualization";
import { HeroMiniClara } from "@/components/ui/HeroMiniClara";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ProcessConduit } from "@/components/ui/ProcessConduit";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import { cx } from "@/lib/cx";
import styles from "./pages.module.css";

const problemServicePhotos = [
  {
    src: "/images/services/workflow-mapping.jpg",
    alt: "Two teammates mapping workflow rules on paper between laptops",
    badge: "Operations",
  },
  {
    src: "/images/services/team-discovery.jpg",
    alt: "Team discovery session reviewing customer conversation flows on laptop",
    badge: "Conversations",
  },
  {
    src: "/images/services/api-code.jpg",
    alt: "Clean software code on a developer laptop screen",
    badge: "Integrations",
  },
  {
    src: "/images/services/software-build.jpg",
    alt: "Software engineer building a custom web application in an IDE",
    badge: "Custom software",
  },
];

const featuredCaseStudies = [
  {
    number: "01",
    slug: "janelles-satin-bouquet",
    category: "Orders, stock & payments",
    title: "Stopping double-sold stock and manual payment checks for a custom bouquet shop.",
    problem:
      "Taking orders in chat meant answering the same price questions all day, checking GCash screenshots by eye, and risking selling a one-of-a-kind bouquet twice.",
    outcome:
      "A phone-friendly storefront locks stock at checkout, verifies exact payment texts automatically, and answers buyer questions from live inventory.",
  },
  {
    number: "02",
    slug: "v-unite-voice-ai-coach",
    category: "AI agents & knowledge retrieval",
    title:
      "An AI business coach that cites clinic records and operating policies instead of guessing.",
    problem:
      "Clinic owners had customer numbers in one database and consultation rules in separate PDF handbooks, and generic AI chat tools invented advice when asked how they connected.",
    outcome:
      "A voice-and-text coaching assistant checks live clinic metrics and uploaded policies before writing a cited answer and saves a clear action plan.",
  },
  {
    number: "03",
    slug: "ai-customer-support-triager",
    category: "Customer support & triage",
    title:
      "Sorting support tickets and escalating urgent customers before a human opens the inbox.",
    problem:
      "Support staff were reading every incoming form submission by hand to figure out what it was about, how urgent it was, and which teammate needed to see it.",
    outcome:
      "Automated intake tags topic, tone, and urgency on arrival, drafts a reply from official FAQ docs, and escalates urgent issues in Slack.",
  },
];

export function HomePage({
  data,
  siteConfig = DEFAULT_SITE_CONFIG,
  featuredProjects,
}: {
  data: HomeData;
  siteConfig?: SiteConfig;
  featuredProjects?: FeaturedHomeProject[];
}) {
  const servicePhotos = [
    {
      ...problemServicePhotos[0],
      src: siteConfig.media.serviceWorkflow || problemServicePhotos[0].src,
    },
    {
      ...problemServicePhotos[1],
      src: siteConfig.media.serviceDiscovery || problemServicePhotos[1].src,
    },
    {
      ...problemServicePhotos[2],
      src: siteConfig.media.serviceApiCode || problemServicePhotos[2].src,
    },
    {
      ...problemServicePhotos[3],
      src: siteConfig.media.serviceSoftwareBuild || problemServicePhotos[3].src,
    },
  ];
  const visibleCaseStudies =
    featuredProjects && featuredProjects.length > 0 ? featuredProjects : featuredCaseStudies;

  return (
    <Page>
      <PageHero
        variant="home"
        tone="ink"
        title={data.hero.title}
        highlight={data.hero.highlight}
        intro={data.hero.intro}
        visual={
          siteConfig.sections.showHomeClara ? (
            <HeroMiniClara turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          ) : undefined
        }
        actions={data.hero.actions.map((action) => (
          <Button
            key={`${action.label}-${action.href}`}
            href={action.href}
            variant={action.variant}
            size={action.variant === "text" ? "default" : "large"}
          >
            {action.label}
          </Button>
        ))}
      >
        <ul className={styles.heroPillars} aria-label="How Clarteon works">
          <li className={styles.heroPillarItem}>
            <div className={styles.heroPillarMeta} aria-hidden="true">
              <span className={styles.heroPillarIndex}>01</span>
              <span className={styles.heroPillarRule} />
            </div>
            <div className={styles.heroPillarText}>
              <p className={styles.heroPillarTitle}>Diagnosis before code</p>
              <p className={styles.heroPillarBody}>
                We map where manual work slows you down first.
              </p>
            </div>
          </li>
          <li className={styles.heroPillarItem}>
            <div className={styles.heroPillarMeta} aria-hidden="true">
              <span className={styles.heroPillarIndex}>02</span>
              <span className={styles.heroPillarRule} />
            </div>
            <div className={styles.heroPillarText}>
              <p className={styles.heroPillarTitle}>Practical AI and automation</p>
              <p className={styles.heroPillarBody}>
                We connect your tools and automate the handoffs.
              </p>
            </div>
          </li>
          <li className={styles.heroPillarItem}>
            <div className={styles.heroPillarMeta} aria-hidden="true">
              <span className={styles.heroPillarIndex}>03</span>
              <span className={styles.heroPillarRule} />
            </div>
            <div className={styles.heroPillarText}>
              <p className={styles.heroPillarTitle}>Scoped to the job</p>
              <p className={styles.heroPillarBody}>From one workflow fix to custom software.</p>
            </div>
          </li>
          <li className={styles.heroPillarItem}>
            <div className={styles.heroPillarMeta} aria-hidden="true">
              <span className={styles.heroPillarIndex}>04</span>
              <span className={styles.heroPillarRule} />
            </div>
            <div className={styles.heroPillarText}>
              <p className={styles.heroPillarTitle}>One clear first step</p>
              <p className={styles.heroPillarBody}>Book a discovery call or chat with Clara.</p>
            </div>
          </li>
        </ul>
      </PageHero>

      {siteConfig.sections.showHomeProblems ? (
        <Section tone="stone" aria-labelledby="problems-title">
          <ScrollReveal className={styles.sectionHeader}>
            <h2 id="problems-title" className={styles.sectionTitle}>
              {siteConfig.sections.homeProblemsTitle || "Tell us what is slowing you down."}
            </h2>
            <p className={styles.sectionIntro}>
              We look at how work moves through your team today and fix the part that costs you the
              most time.
            </p>
          </ScrollReveal>

          <ScrollReveal stagger className={styles.problemGrid}>
            {data.problems.map((problem, index) => {
              const photo = servicePhotos[index % servicePhotos.length];
              return (
                <Card
                  as="article"
                  key={problem.title}
                  className={cx(
                    styles.problemCard,
                    styles.problemPosterCard,
                    problem.href ? styles.interactiveCard : undefined,
                  )}
                >
                  <div className={styles.problemPosterBg} aria-hidden="true">
                    <img
                      src={photo.src}
                      alt=""
                      width={960}
                      height={640}
                      loading="lazy"
                      decoding="async"
                      className={styles.problemPosterImage}
                    />
                    <div className={styles.problemPosterOverlay} />
                  </div>
                  <span className={styles.problemPhotoBadge}>{photo.badge}</span>
                  <div className={styles.problemPosterContent}>
                    <h3 className={styles.problemTitle}>{problem.title}</h3>
                    <p className={styles.problemBody}>{problem.body}</p>
                    <p className={styles.solution}>
                      <span className={styles.solutionPrefix}>Often solved with:</span>
                      {problem.href ? (
                        <Link href={problem.href} className={styles.solutionLink}>
                          {problem.solution}
                        </Link>
                      ) : (
                        <span className={styles.solutionStatic}>{problem.solution}</span>
                      )}
                    </p>
                  </div>
                </Card>
              );
            })}
          </ScrollReveal>
        </Section>
      ) : null}

      {siteConfig.sections.showHomeFlow ? (
        <Section tone="paper" className={styles.flowSection} aria-labelledby="fix-flow-title">
          <ScrollReveal className={styles.visualizationHeader}>
            <h2 id="fix-flow-title" className={styles.visualizationTitle}>
              See how your problems find the right fix.
            </h2>
            <p className={styles.visualizationIntro}>
              Select any bottleneck on the left or capability on the right to trace how Clarteon
              connects daily friction to a working system.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <HeroFlowVisualization />
          </ScrollReveal>
        </Section>
      ) : null}

      {siteConfig.sections.showHomeProcess ? (
        <Section
          tone="ink"
          className={styles.processSection}
          data-conduit-runway="true"
          aria-labelledby="process-title"
        >
          <ScrollReveal className={styles.sectionHeader}>
            <h2 id="process-title" className={styles.sectionTitle}>
              Four steps. Clear and simple.
            </h2>
            <p className={styles.sectionIntro}>
              You always know what we are doing, why we are doing it, and what comes next.
            </p>
          </ScrollReveal>

          <ProcessConduit steps={data.steps} />
        </Section>
      ) : null}

      {siteConfig.sections.showHomeFeaturedWork ? (
        <Section tone="stone" aria-labelledby="proof-title">
          <ScrollReveal className={styles.proofSectionHeader}>
            <div className={styles.sectionHeader}>
              <h2 id="proof-title" className={styles.sectionTitle}>
                {siteConfig.sections.homeFeaturedWorkTitle || data.proof.title}
              </h2>
              <p className={styles.sectionIntro}>{data.proof.body}</p>
            </div>
            <div className={styles.proofHeaderActions}>
              <Button href={data.proof.href} variant="secondary">
                {data.proof.linkLabel}
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className={styles.proofLedger}>
            {visibleCaseStudies.map((study) => (
              <article key={study.slug} className={styles.proofRow}>
                <div className={styles.proofRowMeta}>
                  <span className={styles.proofRowNumber}>{study.number}</span>
                  <span className={styles.proofRowCategory}>{study.category}</span>
                </div>

                <div className={styles.proofRowMain}>
                  <h3 className={styles.proofRowTitle}>
                    <Link href={`/our-work/${study.slug}`} className={styles.proofRowTitleLink}>
                      {study.title}
                    </Link>
                  </h3>

                  <dl className={styles.proofRowComparison}>
                    <div className={styles.proofRowCell}>
                      <dt className={styles.proofRowTerm}>The problem</dt>
                      <dd className={styles.proofRowDetail}>{study.problem}</dd>
                    </div>
                    <div className={styles.proofRowCell}>
                      <dt className={styles.proofRowTerm}>What changed</dt>
                      <dd className={styles.proofRowDetail}>{study.outcome}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.proofRowAction}>
                  <Link
                    href={`/our-work/${study.slug}`}
                    className={styles.proofRowCta}
                    aria-label={`Read case study: ${study.title}`}
                  >
                    <span>Read case study</span>
                    <span className={styles.proofRowArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </ScrollReveal>
        </Section>
      ) : null}

      {siteConfig.sections.showBookingSection ? <BookingSection tone="lime" /> : null}
    </Page>
  );
}
