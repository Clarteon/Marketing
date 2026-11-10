import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin/auth";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";

const mocks = vi.hoisted(() => ({
  config: {
    ADMIN_AUTH_SECRET: "a-test-secret-that-is-long-enough-123456",
  },
  rescheduleBooking: vi.fn(),
  updateBookingDetails: vi.fn(),
  alertTeam: vi.fn(async () => {}),
}));

const SECRET = mocks.config.ADMIN_AUTH_SECRET;

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config,
}));

vi.mock("@/lib/booking/admin-service", () => ({
  rescheduleBooking: mocks.rescheduleBooking,
  updateBookingDetails: mocks.updateBookingDetails,
}));

vi.mock("@/lib/alerts", () => ({ alertTeam: mocks.alertTeam }));

import { PATCH } from "@/app/api/admin/bookings/[requestId]/route";
import { BookingFailedError } from "@/lib/booking/errors";
import { BookingNotFoundError, SlotTakenError } from "@/lib/booking/store";
import type { BookingRecord } from "@/lib/booking/types";

const REQUEST_ID = "00000000-0000-4000-8000-000000000001";
const PARAMS = { params: Promise.resolve({ requestId: REQUEST_ID }) };

function savedBooking(): BookingRecord {
  return {
    requestId: REQUEST_ID,
    slotStart: new Date("2026-11-20T06:00:00.000Z"),
    slotEnd: new Date("2026-11-20T06:30:00.000Z"),
    name: "Ada Lovelace",
    email: "ada@example.com",
    notes: "Reporting takes too long.",
    timezone: "Asia/Manila",
    status: "confirmed",
    googleEventId: "event-1",
    meetLink: "https://meet.google.com/abc-defg-hij",
    createdAt: new Date("2026-11-10T02:00:00.000Z"),
    confirmedAt: new Date("2026-11-10T02:01:00.000Z"),
  };
}

function editRequest(body: unknown, options: { cookie?: string; origin?: string } = {}) {
  return new Request(`http://localhost:3000/api/admin/bookings/${REQUEST_ID}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? "http://localhost:3000",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function signedIn(body: unknown) {
  const token = createAdminSessionToken(SECRET);
  return editRequest(body, { cookie: `clarteon_admin=${encodeURIComponent(token)}` });
}

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.rescheduleBooking.mockReset();
  mocks.updateBookingDetails.mockReset();
  mocks.alertTeam.mockReset();
});

describe("PATCH /api/admin/bookings/[requestId]", () => {
  it("rejects a request from another origin", async () => {
    const response = await PATCH(
      editRequest({ name: "Grace Hopper" }, { origin: "https://evil.example" }),
      PARAMS,
    );

    expect(response.status).toBe(403);
    expect(mocks.updateBookingDetails).not.toHaveBeenCalled();
  });

  it("rejects a request without a session", async () => {
    const response = await PATCH(editRequest({ name: "Grace Hopper" }), PARAMS);

    expect(response.status).toBe(401);
    expect(mocks.updateBookingDetails).not.toHaveBeenCalled();
  });

  it("rejects a payload that mixes details and a new slot", async () => {
    const response = await PATCH(signedIn({ name: "Grace Hopper", slotId: "abc-123" }), PARAMS);

    expect(response.status).toBe(400);
    expect(mocks.updateBookingDetails).not.toHaveBeenCalled();
    expect(mocks.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("rejects an empty payload", async () => {
    const response = await PATCH(signedIn({}), PARAMS);

    expect(response.status).toBe(400);
  });

  it("rejects a malformed request id", async () => {
    const response = await PATCH(signedIn({ name: "Grace Hopper" }), {
      params: Promise.resolve({ requestId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.updateBookingDetails).not.toHaveBeenCalled();
  });

  it("saves guest details for a signed-in admin", async () => {
    mocks.updateBookingDetails.mockResolvedValue({
      ...savedBooking(),
      name: "Grace Hopper",
    });

    const response = await PATCH(signedIn({ name: "Grace Hopper", notes: null }), PARAMS);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.booking.name).toBe("Grace Hopper");
    expect(body.booking).not.toHaveProperty("googleEventId");
    expect(mocks.updateBookingDetails).toHaveBeenCalledWith(REQUEST_ID, {
      name: "Grace Hopper",
      notes: null,
    });
  });

  it("reschedules for a signed-in admin", async () => {
    mocks.rescheduleBooking.mockResolvedValue(savedBooking());

    const response = await PATCH(signedIn({ slotId: "c2xvdC1pZA" }), PARAMS);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(mocks.rescheduleBooking).toHaveBeenCalledWith(REQUEST_ID, "c2xvdC1pZA");
    expect(mocks.updateBookingDetails).not.toHaveBeenCalled();
  });

  it("answers 404 when the booking is missing", async () => {
    mocks.updateBookingDetails.mockRejectedValue(new BookingNotFoundError());

    const response = await PATCH(signedIn({ name: "Grace Hopper" }), PARAMS);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("booking_not_found");
  });

  it("answers 409 when the slot is already taken", async () => {
    mocks.rescheduleBooking.mockRejectedValue(new SlotTakenError(savedBooking()));

    const response = await PATCH(signedIn({ slotId: "c2xvdC1pZA" }), PARAMS);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("slot_unavailable");
  });

  it("answers 503 and alerts the team when the calendar fails", async () => {
    mocks.rescheduleBooking.mockRejectedValue(new BookingFailedError("calendar_update"));

    const response = await PATCH(signedIn({ slotId: "c2xvdC1pZA" }), PARAMS);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("booking_edit_failed");
    expect(mocks.alertTeam).toHaveBeenCalledWith("booking_failed", {
      code: "calendar_update",
    });
  });

  it("answers 500 without leaking details on an unexpected error", async () => {
    mocks.updateBookingDetails.mockRejectedValue(new Error("secret internal message"));

    const response = await PATCH(signedIn({ name: "Grace Hopper" }), PARAMS);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret internal message");
  });
});
