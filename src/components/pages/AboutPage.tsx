import Image from "next/image";
import Link from "next/link";
import type { SimplePageData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import { DEFAULT_TEAM_MEMBERS, type TeamMember } from "@/lib/team";
import { BookingSection } from "@/components/ui/BookingSection";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

function TeamPortraitSlot({ member }: { member: TeamMember }) {
  const isExecutive = member.tier === 1;

  if (member.photoUrl) {
    return (
      <div className={styles.orgPortraitFrame}>
        <img
          src={member.photoUrl}
          alt={`${member.name} portrait`}
          className={styles.orgPortraitImg}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cx(
        styles.orgPortraitFrame,
        isExecutive ? styles.orgPortraitPlaceholderDark : styles.orgPortraitPlaceholder,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 132" className={styles.orgPortraitSilhouette} focusable="false">
        <rect
          x="8"
          y="8"
          width="104"
          height="116"
          rx="10"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeDasharray="3 3"
        />
        <circle cx="60" cy="48" r="18" fill="currentColor" fillOpacity="0.16" />
        <path d="M30 112c0-18 13-29 30-29s30 11 30 29" fill="currentColor" fillOpacity="0.14" />
      </svg>
      <span className={styles.orgPortraitMonogram}>{member.monogram}</span>
      <span className={styles.orgPortraitCaption}>Photo pending</span>
    </div>
  );
}

function OrgNodeCard({ member }: { member: TeamMember }) {
  const isExecutive = member.tier === 1;

  return (
    <article
      className={cx(styles.orgNodeCard, isExecutive && styles.orgNodeCardExecutive)}
      aria-label={`${member.name}, ${member.role}`}
    >
      <TeamPortraitSlot member={member} />
      <div className={styles.orgNodeBody}>
        <span className={cx(styles.orgNodeTag, isExecutive && styles.orgNodeTagExecutive)}>
          {member.department}
        </span>
        <h3 className={cx(styles.orgNodeName, isExecutive && styles.orgNodeNameExecutive)}>
          {member.name}
        </h3>
        <p className={cx(styles.orgNodeRole, isExecutive && styles.orgNodeRoleExecutive)}>
          {member.role}
        </p>
      </div>
    </article>
  );
}

export function AboutPage({
  data,
  body,
  team = DEFAULT_TEAM_MEMBERS,
  aboutClarityPhoto = "/images/editorial/about-clarity.jpg",
  showOrgChart = true,
  orgTitle = "Organizational structure",
  showBookingSection = true,
}: {
  data: SimplePageData;
  body: string;
  team?: TeamMember[];
  aboutClarityPhoto?: string;
  showOrgChart?: boolean;
  orgTitle?: string;
  showBookingSection?: boolean;
}) {
  const executiveTier = team.filter((member) => member.tier === 1);
  const leadershipTier = team.filter((member) => member.tier === 2);
  const deliveryTier = team.filter((member) => member.tier === 3);
  const isLocalPhoto = aboutClarityPhoto.startsWith("/");

  return (
    <Page>
      <PageHero tone="paper" title={data.hero.title} intro={data.hero.intro} />
      <Section>
        <div className={styles.aboutEditorialGrid}>
          <div className={styles.aboutSideRail}>
            <figure className={styles.aboutFigure}>
              <div className={styles.aboutPhotoFrame}>
                {isLocalPhoto ? (
                  <Image
                    src={aboutClarityPhoto}
                    alt="Clear daylight geometry across structural architectural glass panels"
                    width={960}
                    height={640}
                    sizes="(max-width: 960px) 100vw, 34vw"
                    className={styles.editorialPhoto}
                  />
                ) : (
                  <img
                    src={aboutClarityPhoto}
                    alt="Clear daylight geometry across structural architectural glass panels"
                    loading="lazy"
                    className={styles.editorialPhoto}
                  />
                )}
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

      {showOrgChart ? (
        <Section tone="stone" aria-labelledby="org-structure-heading">
          <ScrollReveal className={styles.orgHeader} variant="rise">
            <div>
              <p className={styles.orgEyebrow}>Team &amp; structure</p>
              <h2 id="org-structure-heading" className={styles.orgHeading}>
                {orgTitle}
              </h2>
            </div>
            <p className={styles.orgLead}>
              Every engagement moves from executive alignment directly to the product lead and
              engineers building your system, with zero handoff bloat.
            </p>
          </ScrollReveal>

          <div
            className={styles.orgChart}
            role="region"
            aria-label="Clarteon organizational hierarchy"
          >
            <div className={styles.orgTierRoot}>
              {executiveTier.map((member) => (
                <OrgNodeCard key={member.id} member={member} />
              ))}
            </div>

            <div className={styles.orgBranchTrunk} aria-hidden="true">
              <span className={styles.orgSpineVertical} />
              <span className={styles.orgBranchHorizontal} />
            </div>

            <div className={styles.orgTierPair}>
              {leadershipTier.map((member) => (
                <div key={member.id} className={styles.orgBranchColumn}>
                  <span className={styles.orgDropConnector} aria-hidden="true" />
                  <OrgNodeCard member={member} />
                </div>
              ))}
            </div>

            <div className={styles.orgBranchTrunk} aria-hidden="true">
              <span className={styles.orgSpineVertical} />
              <span className={styles.orgBranchHorizontal} />
            </div>

            <div className={styles.orgTierPair}>
              {deliveryTier.map((member) => (
                <div key={member.id} className={styles.orgBranchColumn}>
                  <span className={styles.orgDropConnector} aria-hidden="true" />
                  <OrgNodeCard member={member} />
                </div>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {showBookingSection ? <BookingSection /> : null}
    </Page>
  );
}
