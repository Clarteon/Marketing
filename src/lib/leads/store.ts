import "server-only";
import { getConfig } from "@/lib/config";
import type { TeamSize } from "./constants";
import { NeonLeadStore } from "./neon-store";

export type LeadSource = "website-form" | "clara-chat";
export type EmailKind = "team" | "receipt";

export interface NewLead {
  requestId: string;
  name: string;
  email: string;
  company?: string;
  need: string;
  teamSize?: TeamSize;
  source: LeadSource;
}

export interface Lead extends NewLead {
  id: string;
  createdAt: Date;
}

export interface SaveLeadResult {
  lead: Lead;
  created: boolean;
}

export interface LeadUpdate {
  name: string;
  email: string;
  company?: string;
  need: string;
  teamSize?: TeamSize;
}

export interface LeadStore {
  save(input: NewLead): Promise<SaveLeadResult>;
  /** Clara may add detail across turns. Form leads are never changed by this path. */
  updateFromChat?(id: string, input: LeadUpdate): Promise<Lead>;
  markEmailSent(id: string, kind: EmailKind): Promise<void>;
  markEmailFailure(id: string, errorCode: string): Promise<void>;
}

export class LeadStoreNotConfiguredError extends Error {
  constructor() {
    super("Lead storage is not configured.");
    this.name = "LeadStoreNotConfiguredError";
  }
}

let store: LeadStore | undefined;

export function getLeadStore(): LeadStore {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new LeadStoreNotConfiguredError();

  store ??= new NeonLeadStore(DATABASE_URL);
  return store;
}

export function resetLeadStoreForTests(): void {
  store = undefined;
}
