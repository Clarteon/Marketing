import Image from "next/image";
import Link from "next/link";
import type { SimplePageData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function AboutPage({ data, body }: { data: SimplePageData; body: string }) {
  return (
    <Page>
      <PageHero tone="paper" title={data.hero.title} intro={data.hero.intro} />
      <Section>
        <div className={styles.aboutEditorialGrid}>
          <div className={styles.aboutSideRail}>
            <figure className={styles.aboutFigure}>
              <div className={styles.aboutPhotoFrame}>
                <Image
                  src="/images/editorial/about-clarity.jpg"
                  alt="Clear daylight geometry across structural architectural glass panels"
                  width={960}
                  height={640}
                  sizes="(max-width: 960px) 100vw, 34vw"
                  className={styles.editorialPhoto}
                />
              </div>
              <figcaption className={styles.aboutFigureCaption}>
                Clarteon takes its name from the French word clarté, meaning clarity.
              </figcaption>
            </figure>

            <ul className={styles.editorialLinkList} aria-label="Further reading">
              <li>
                <Link href="/solutions" className={styles.editorialTextLink}>
                  Common bottlenecks and solutions
                </Link>
              </li>
              <li>
                <Link href="/how-we-work" className={styles.editorialTextLink}>
                  From discovery call to delivery
                </Link>
              </li>
              <li>
                <Link href="/our-work" className={styles.editorialTextLink}>
                  Sample system architectures
                </Link>
              </li>
              <li>
                <Link href="/contact#book" className={styles.editorialTextLink}>
                  Book a discovery call
                </Link>
              </li>
            </ul>
          </div>

          <Markdown reveal className={cx(styles.aboutProse, styles.legalProse)}>
            {body}
          </Markdown>
        </div>
      </Section>
      <BookingSection />
    </Page>
  );
}
