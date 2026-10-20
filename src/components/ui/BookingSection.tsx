import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./ui.module.css";

interface BookingSectionProps {
  id?: string;
  mode?: "link" | "placeholder";
  title?: string;
  body?: string;
}

const defaultTitle = "Tell us the problem. We will find the clearest way through.";
const defaultBody =
  "A discovery call is a short conversation about what is slowing you down and what a good outcome looks like.";

export function BookingSection({
  id = "book",
  mode = "link",
  title = defaultTitle,
  body = defaultBody,
}: BookingSectionProps) {
  const titleId = `${id}-title`;

  return (
    <Section tone="ink" id={id} aria-labelledby={titleId}>
      <div className={styles.booking}>
        <div className={styles.bookingContent}>
          <p className={styles.eyebrow}>Next step</p>
          <h2 id={titleId} className={styles.bookingTitle}>
            {title}
          </h2>
          {mode === "link" ? <p className={styles.bookingIntro}>{body}</p> : null}
        </div>

        <div className={styles.bookingActions}>
          {mode === "link" ? (
            <>
              <Button href="/contact#book" size="large">
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
