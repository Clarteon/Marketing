"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import styles from "@/app/admin/admin.module.css";

interface CancelBookingProps {
  requestId: string;
  guestName: string;
}

function cancelError(status: number): string {
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 404) return "This booking no longer exists.";
  if (status === 409) return "This booking is already cancelled.";
  if (status === 429) return "Too many changes in a row. Wait a moment and try again.";
  if (status === 503) {
    return "The cancellation did not finish. Check the status before trying again.";
  }
  return "Could not cancel the booking. Try again.";
}

export function CancelBooking({ requestId, guestName }: CancelBookingProps) {
  const router = useRouter();
  const toast = useToast();

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/bookings/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };

      if (!response.ok || !payload.ok) {
        setError(cancelError(response.status));
        return;
      }

      setConfirming(false);
      toast.addToast({
        kind: "success",
        message: "Booking cancelled. The guest was emailed and the time is open again.",
      });
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button
          className={styles.dangerButton}
          type="button"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
        >
          Cancel booking
        </button>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className={styles.cancelWarning}>
        Cancel {guestName}&rsquo;s call? The invitation disappears from their calendar, Google
        emails them that it is cancelled, and the time opens for someone else. The booking record
        stays.
      </p>
      <div className={styles.cancelActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
        >
          Keep booking
        </button>
        <button className={styles.dangerButton} type="button" disabled={busy} onClick={cancel}>
          {busy ? "Cancelling…" : "Yes, cancel booking"}
        </button>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
