import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "./filter-bar";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { leadsListSchema, type LeadsListQuery } from "@/lib/admin/schema";
import { LEADS_PAGE_SIZE, listLeads, type LeadsListResult } from "@/lib/admin/lead-queries";
import { LeadStoreNotConfiguredError } from "@/lib/leads/store";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

function pageLink(current: LeadsListQuery, page: number): string {
  const params = new URLSearchParams();
  if (current.source !== "all") params.set("source", current.source);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/leads?${qs}` : "/admin/leads";
}

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const raw = await searchParams;
  const parsed = leadsListSchema.safeParse({
    source: first(raw.source),
    page: first(raw.page),
  });
  const query = parsed.success ? parsed.data : leadsListSchema.parse({});

  let list: LeadsListResult | undefined;
  let configured = true;
  let unavailable = false;

  try {
    list = await listLeads(query);
  } catch (error) {
    if (error instanceof LeadStoreNotConfiguredError) {
      configured = false;
    } else {
      unavailable = true;
      logServerEvent("admin_leads_list_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  const total = list?.total ?? 0;
  const rows = list?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Leads</h1>
          <p className={styles.intro}>
            Every project brief from the contact form and every lead Clara saved, newest first. The
            need is shown as the visitor wrote it.
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
            The lead list is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : (
        <>
          <FilterBar source={query.source} />

          <div className={styles.statusBar}>
            <span>
              {total} {total === 1 ? "lead" : "leads"}
            </span>
            <span>
              Page {query.page} of {totalPages}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className={styles.empty}>
              {total === 0 ? (
                <>
                  <p>
                    {query.source === "all" ? "No leads yet." : "No leads from this source yet."}
                  </p>
                  <p>
                    {query.source === "all" ? (
                      "When someone sends a project brief, or Clara saves one, it appears here."
                    ) : (
                      <>
                        <Link href="/admin/leads">Clear the filter</Link> to see every lead.
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p>This page is past the end of the list.</p>
                  <p>
                    <Link href={pageLink(query, 1)}>Go to the first page</Link>.
                  </p>
                </>
              )}
            </div>
          ) : (
            <LeadsTable rows={rows} />
          )}

          <div className={styles.pagination}>
            {query.page > 1 ? (
              <Button href={pageLink(query, query.page - 1)} variant="secondary">
                Previous
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            {query.page < totalPages ? (
              <Button href={pageLink(query, query.page + 1)} variant="secondary">
                Next
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        </>
      )}
    </main>
  );
}
