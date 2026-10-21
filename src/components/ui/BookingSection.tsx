import { BookingForm } from "./BookingForm";
import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./ui.module.css";

interface BookingSectionProps {
  id?: string;
  mode?: "link" | "placeholder" | "form";
  tone?: "ink" | "lime";
  title?: string;
  body?: string;
  turnstileSiteKey?: string;
}

const defaultTitle = "Tell us the problem. We will find the clearest way through.";
const defaultBody =
  "A discovery call is a short conversation about what is slowing you down and what a good outcome looks like.";

export function BookingSection({
  id = "book",
  mode = "link",
  tone = "ink",
  title = defaultTitle,
  body = defaultBody,
  turnstileSiteKey,
}: BookingSectionProps) {
  const titleId = `${id}-title`;
  const onLime = tone === "lime";

  return (
    <Section tone={tone} id={id} aria-labelledby={titleId}>
      <div className={`${styles.booking} ${mode === "form" ? styles.bookingFormLayout : ""}`}>
        <div className={styles.bookingContent}>
          {onLime ? null : <p className={styles.eyebrow}>Next step</p>}
          <h2 id={titleId} className={styles.bookingTitle}>
            {title}
          </h2>
          {mode === "link" || mode === "form" ? (
            <p className={styles.bookingIntro}>{body}</p>
          ) : null}
        </div>

        <div className={styles.bookingActions}>
          {mode === "form" ? (
            <BookingForm turnstileSiteKey={turnstileSiteKey} />
          ) : mode === "link" ? (
            <>
              <Button href="/contact#book" variant={onLime ? "dark" : "primary"} size="large">
                Book a free discovery call
              </Button>
              <Button href="/contact#brief" variant="secondary" size="large">
                Send a project brief
              </Button>
              <Button href="/contact#message" variant="text">
                Or message us
              </Button>
            </>
          ) : (
            <div className={styles.bookingPlaceholder}>
              <p>{body}</p>
              <Button href="#brief" variant="secondary">
                Go to the project brief
              </Button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
