import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/admin/LeadSourceBadge";
import { LeadEditForm } from "./lead-edit-form";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { dateLabel } from "@/lib/admin/format";
import { getLead, type AdminLeadRow } from "@/lib/admin/lead-queries";
import { LeadStoreNotConfiguredError } from "@/lib/leads/store";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SOURCE_NOTES = {
  "website-form": "Sent through the project brief form on the website.",
  "clara-chat": "Saved by Clara during a chat with a visitor.",
} as const;

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLeadDetailPage({ params }: LeadDetailPageProps) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const { id } = await params;

  let lead: AdminLeadRow | undefined;
  let configured = true;
  let unavailable = false;

  if (UUID.test(id)) {
    try {
      lead = await getLead(id);
    } catch (error) {
      if (error instanceof LeadStoreNotConfiguredError) {
        configured = false;
      } else {
        unavailable = true;
        logServerEvent("admin_lead_detail_failed", {
          code: error instanceof Error ? error.name : "unknown",
        });
      }
    }
  }

  return (
    <main className={styles.page} id="main">
      <p className={styles.backLink}>
        <Link href="/admin/leads">← Back to leads</Link>
      </p>

      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Lead</h1>
          <p className={styles.intro}>
            The brief as the visitor sent it, with the team&rsquo;s own notes on where it stands.
            Editing here changes this record only: nothing is emailed and Clara&rsquo;s knowledge
            stays as it is.
          </p>
        </div>
      </div>

      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Lead storage is not configured. Add <code>DATABASE_URL</code> in the server environment
            and run <code>npm run db:init</code>.
          </p>
        </div>
      ) : unavailable ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            This lead is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : !lead ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            This lead does not exist. It may have been deleted under the retention policy.
          </p>
          <p className={styles.backLink}>
            <Link href="/admin/leads">Back to leads</Link>
          </p>
        </div>
      ) : (
        <>
          <div className={styles.statusBar}>
            <span>
              <LeadStatusBadge status={lead.status} />
            </span>
            <span>
              <LeadSourceBadge source={lead.source} />
            </span>
            <span>Received {dateLabel(lead.createdAt)}</span>
            <span>Updated {dateLabel(lead.updatedAt)}</span>
          </div>

          <div className={styles.detailStack}>
            <section
              className={styles.panel}
              aria-labelledby="lead-details-title"
              aria-describedby="lead-details-note"
            >
              <h2 className={styles.sectionTitle} id="lead-details-title">
                Lead details
              </h2>
              <p className={styles.sectionIntro} id="lead-details-note">
                {SOURCE_NOTES[lead.source]} Name, email, company and team size come from the
                visitor. Changes save to this record only.
              </p>
              <LeadEditForm
                lead={{
                  id: lead.id,
                  name: lead.name,
                  email: lead.email,
                  company: lead.company ?? null,
                  need: lead.need,
                  teamSize: lead.teamSize ?? null,
                  status: lead.status,
                }}
              />
            </section>

            <section className={styles.panel} aria-labelledby="lead-emails-title">
              <h2 className={styles.sectionTitle} id="lead-emails-title">
                Emails
              </h2>
              <p className={styles.meta}>
                Team alert{" "}
                {lead.teamEmailSentAt ? `sent ${dateLabel(lead.teamEmailSentAt)}` : "not sent"}
                {" · "}
                Visitor receipt{" "}
                {lead.receiptEmailSentAt
                  ? `sent ${dateLabel(lead.receiptEmailSentAt)}`
                  : "not sent"}
              </p>
              {lead.lastError ? <p className={styles.meta}>Last error {lead.lastError}</p> : null}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
