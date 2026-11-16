import Image from "next/image";
import { cx } from "@/lib/cx";
import { getAuthorMember, type TeamMember } from "@/lib/team";
import { getAuthorMonogram } from "./EditorialArticleBody";
import styles from "./pages.module.css";

interface AuthorBadgeProps {
  name?: string;
  team?: readonly TeamMember[];
  className: string;
}

export function AuthorBadge({ name, team, className }: AuthorBadgeProps) {
  const member = team ? getAuthorMember(name, team) : null;
  const photoUrl = member?.photoUrl?.trim();
  const monogram = member?.monogram ?? getAuthorMonogram(name);

  if (photoUrl) {
    return (
      <span className={cx(className, styles.authorBadgeWithPhoto)} aria-hidden="true">
        {photoUrl.startsWith("/") ? (
          <Image
            src={photoUrl}
            alt=""
            width={40}
            height={40}
            sizes="40px"
            className={styles.authorBadgePhoto}
          />
        ) : (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={styles.authorBadgePhoto}
          />
        )}
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {monogram}
    </span>
  );
}
