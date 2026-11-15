import { cx } from "@/lib/cx";
import styles from "./service-photo-collage.module.css";

export interface CollagePhoto {
  src: string;
  alt: string;
  caption?: string;
}

interface ServicePhotoCollageProps {
  primary: CollagePhoto;
  secondary?: CollagePhoto;
  className?: string;
}

export function ServicePhotoCollage({ primary, secondary, className }: ServicePhotoCollageProps) {
  return (
    <div className={cx(styles.collage, className)} data-testid="service-photo-collage">
      <div className={cx(styles.diptych, !secondary && styles.diptychSingle)}>
        <figure className={cx(styles.card, styles.cardPrimary)}>
          <div className={styles.imageViewport}>
            <img
              src={primary.src}
              alt={primary.alt}
              width={960}
              height={640}
              loading="lazy"
              decoding="async"
              className={styles.image}
            />
          </div>
          {primary.caption ? (
            <figcaption className={styles.caption}>
              <span className={styles.captionDot} aria-hidden="true" />
              <span>{primary.caption}</span>
            </figcaption>
          ) : null}
        </figure>

        {secondary ? (
          <figure className={cx(styles.card, styles.cardSecondary)}>
            <div className={styles.imageViewport}>
              <img
                src={secondary.src}
                alt={secondary.alt}
                width={960}
                height={640}
                loading="lazy"
                decoding="async"
                className={styles.image}
              />
            </div>
            {secondary.caption ? (
              <figcaption className={styles.caption}>
                <span className={styles.captionDot} aria-hidden="true" />
                <span>{secondary.caption}</span>
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </div>
  );
}
