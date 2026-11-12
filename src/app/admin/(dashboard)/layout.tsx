import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  return (
    <>
      <AdminTopBar />
      {children}
    </>
  );
}
