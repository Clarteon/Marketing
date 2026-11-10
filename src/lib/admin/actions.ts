"use server";

import { isAdminPageAuthenticated } from "./auth";
import { listBookings, type BookingsListQuery } from "./queries";
import { bookingsListSchema } from "./schema";
import { BookingStoreNotConfiguredError } from "@/lib/booking/store";
import { logServerEvent } from "@/lib/log";

export type BookingsResult =
  | { ok: true; data: Awaited<ReturnType<typeof listBookings>> }
  | { ok: false; error: "not_configured" | "unavailable" };

export async function getBookings(query: BookingsListQuery): Promise<BookingsResult> {
  "use server";

  const authenticated = await isAdminPageAuthenticated();
  if (!authenticated) {
    logServerEvent("admin_bookings_unauthorized", {});
    return { ok: false, error: "unavailable" };
  }

  const parsed = bookingsListSchema.safeParse(query);
  if (!parsed.success) {
    return { ok: false, error: "unavailable" };
  }

  try {
    const data = await listBookings(parsed.data);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof BookingStoreNotConfiguredError) {
      return { ok: false, error: "not_configured" };
    }
    logServerEvent("admin_bookings_list_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "unavailable" };
  }
}
