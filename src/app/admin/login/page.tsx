import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminSecret, isAdminPageAuthenticated } from "@/lib/admin/auth";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdminPageAuthenticated()) redirect("/admin/review");

  let configured = false;
  try {
    configured = Boolean(adminSecret());
  } catch {
    configured = false;
  }

  return (
    <main className={styles.page} id="main">
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Clarteon admin</p>
        <h1 className={styles.title}>Review queue sign-in</h1>
        <p className={styles.intro}>
          Sign in to review questions Clara could not answer. Only the team should have this
          password.
        </p>

        {configured ? (
          <LoginForm />
        ) : (
          <p className={styles.notice} role="status">
            Admin sign-in is not configured. Set <code>ADMIN_AUTH_SECRET</code> in the server
            environment first.
          </p>
        )}

        <p className={styles.backLink}>
          <Link href="/">Back to the site</Link>
        </p>
      </div>
    </main>
  );
}
