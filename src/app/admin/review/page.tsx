import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { getKnowledgeStatus, getReviewQueue } from "@/lib/knowledge/service";
import { KnowledgeStoreNotConfiguredError } from "@/lib/knowledge/store";
import type { KnowledgeIndexStatus, ReviewQuestion } from "@/lib/knowledge/types";
import { logServerEvent } from "@/lib/log";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

function dateLabel(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function AdminReviewPage() {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  let questions: ReviewQuestion[] = [];
  let status: KnowledgeIndexStatus | undefined;
  let configured = true;
  let unavailable = false;

  try {
    questions = await getReviewQueue(50);
  } catch (error) {
    if (error instanceof KnowledgeStoreNotConfiguredError) {
      configured = false;
    } else {
      unavailable = true;
      logServerEvent("admin_review_queue_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  try {
    status = await getKnowledgeStatus();
  } catch (error) {
    status = undefined;
    if (!(error instanceof KnowledgeStoreNotConfiguredError)) {
      logServerEvent("admin_review_status_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Review queue</h1>
          <p className={styles.intro}>
            Questions Clara could not answer land here. An approved answer becomes published
            knowledge and is added to the search index. Do not publish prices, guarantees, client
            names or claims the team cannot support.
          </p>
        </div>
        <LogoutButton />
      </div>

      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            The knowledge store is not configured. Add <code>DATABASE_URL</code> in the server
            environment and run <code>npm run db:init</code>.
          </p>
        </div>
      ) : unavailable ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            The review queue is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.statusBar}>
            <span>{questions.length} open</span>
            {status ? (
              <>
                <span>{status.chunkCount} knowledge chunks</span>
                <span>{status.faqCount} approved answers</span>
                <span>Rebuilt {dateLabel(status.generatedAt)}</span>
              </>
            ) : null}
          </div>
          <ReviewQueue questions={questions} />
        </>
      )}
    </main>
  );
}
