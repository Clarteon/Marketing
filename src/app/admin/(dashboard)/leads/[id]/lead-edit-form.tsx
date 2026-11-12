"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/ToastProvider";
import {
  leadStatusLabels,
  leadStatuses,
  teamSizeLabels,
  teamSizes,
  type LeadStatus,
  type TeamSize,
} from "@/lib/leads/constants";
import styles from "@/app/admin/admin.module.css";

interface LeadEditFormProps {
  lead: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    need: string;
    teamSize: TeamSize | null;
    status: LeadStatus;
  };
}

const statusOptions = leadStatuses.map((value) => ({ value, label: leadStatusLabels[value] }));

const teamSizeOptions = [
  { value: null, label: "Not set" },
  ...teamSizes.map((value) => ({ value, label: teamSizeLabels[value] })),
];

function errorMessage(status: number): string {
  if (status === 400) return "Some values are not valid. Check the fields and try again.";
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 404) return "This lead no longer exists.";
  if (status === 429) return "Too many edits in a row. Wait a moment and try again.";
  if (status === 503) return "Lead storage is unavailable. Try again later.";
  return "Could not save the change. Try again.";
}

export function LeadEditForm({ lead }: LeadEditFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email);
  const [company, setCompany] = useState(lead.company ?? "");
  const [teamSize, setTeamSize] = useState<TeamSize | null>(lead.teamSize);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [need, setNeed] = useState(lead.need);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const savedCompany = lead.company ?? "";
  const dirty =
    name !== lead.name ||
    email !== lead.email ||
    company !== savedCompany ||
    teamSize !== lead.teamSize ||
    status !== lead.status ||
    need !== lead.need;

  function reset() {
    setName(lead.name);
    setEmail(lead.email);
    setCompany(savedCompany);
    setTeamSize(lead.teamSize);
    setStatus(lead.status);
    setNeed(lead.need);
    setError("");
    setSaved(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;

    setBusy(true);
    setError("");
    setSaved(false);

    try {
      const patch: Record<string, unknown> = {};
      if (name !== lead.name) patch.name = name;
      if (email !== lead.email) patch.email = email;
      if (company !== savedCompany) patch.company = company.trim() === "" ? null : company.trim();
      if (teamSize !== lead.teamSize) patch.teamSize = teamSize;
      if (status !== lead.status) patch.status = status;
      if (need !== lead.need) patch.need = need;

      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };

      if (!response.ok || !payload.ok) {
        setError(errorMessage(response.status));
        return;
      }

      setSaved(true);
      toast.addToast({ kind: "success", message: "Lead updated." });
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.twoColumns}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lead-name">
            Name
          </label>
          <input
            className={styles.input}
            id="lead-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            maxLength={120}
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lead-email">
            Email
          </label>
          <input
            className={styles.input}
            id="lead-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSaved(false);
            }}
            maxLength={254}
            aria-describedby="lead-email-hint"
            disabled={busy}
          />
        </div>
      </div>
      <p className={styles.hint} id="lead-email-hint">
        This is the address receipts and follow-ups use. A typo here is worth fixing at the source
        too.
      </p>

      <div className={styles.twoColumns}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lead-company">
            Company
          </label>
          <input
            className={styles.input}
            id="lead-company"
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setSaved(false);
            }}
            maxLength={200}
            disabled={busy}
          />
        </div>
        <SelectField
          id="lead-team-size"
          label="Team size"
          options={teamSizeOptions}
          value={teamSize}
          placeholder="Not set"
          disabled={busy}
          onValueChange={(value) => {
            setTeamSize((value as TeamSize | null) ?? null);
            setSaved(false);
          }}
        />
      </div>

      <SelectField
        id="lead-status"
        label="Follow-up status"
        options={statusOptions}
        value={status}
        disabled={busy}
        onValueChange={(value) => {
          if (value) {
            setStatus(value as LeadStatus);
            setSaved(false);
          }
        }}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lead-need">
          What they need
        </label>
        <textarea
          className={styles.textarea}
          id="lead-need"
          value={need}
          onChange={(event) => {
            setNeed(event.target.value);
            setSaved(false);
          }}
          rows={5}
          maxLength={2_000}
          aria-describedby="lead-need-hint"
          disabled={busy}
        />
        <p className={styles.hint} id="lead-need-hint">
          Written by the visitor. Tidy a typo if you like, but keep what they meant.
        </p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p className={styles.success} role="status">
          Saved. The list now shows the updated lead.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.primaryButton} type="submit" disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={reset}
          disabled={busy || !dirty}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
