import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { listAdminProjects } from "@/lib/admin/projects";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export default async function AdminProjectsPage() {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const { configured, schemaMissing, projects } = await listAdminProjects();

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.intro}>
            Add, reorder, or update case studies and project features displayed across Home and Our
            work.
          </p>
        </div>
      </div>

      <ProjectsManager
        initialProjects={projects}
        configured={configured}
        schemaMissing={schemaMissing}
      />
    </main>
  );
}
