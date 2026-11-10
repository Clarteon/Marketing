import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { bookingsListSchema } from "@/lib/admin/schema";
import { BookingsDashboard } from "./bookings-dashboard";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface BookingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

export default async function AdminBookingsPage({ searchParams }: BookingsPageProps) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const raw = await searchParams;
  const parsed = bookingsListSchema.safeParse({
    status: first(raw.status),
    timing: first(raw.timing),
    page: first(raw.page),
  });
  const query = parsed.success ? parsed.data : bookingsListSchema.parse({});

  return <BookingsDashboard initialQuery={query} />;
}
