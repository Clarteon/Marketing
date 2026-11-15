import "server-only";

import { neon } from "@neondatabase/serverless";
import { getConfig } from "@/lib/config";
import { logServerEvent } from "@/lib/log";
import { adminSiteConfigSchema, type AdminSiteConfigPayload } from "./schema";
import { DEFAULT_SITE_CONFIG, type SiteConfig } from "./site-config-defaults";

const SITE_CONFIG_KEY = "site_settings";

export class SiteConfigStoreNotConfiguredError extends Error {
  constructor() {
    super("Site configuration database storage is not configured.");
  }
}

function getSql() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new SiteConfigStoreNotConfiguredError();
  return neon(DATABASE_URL);
}

function mergeWithDefaults(raw: unknown): SiteConfig {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<SiteConfig>;
  const candidate: SiteConfig = {
    sections: {
      ...DEFAULT_SITE_CONFIG.sections,
      ...(input.sections ?? {}),
    },
    pageHeroes: {
      ...DEFAULT_SITE_CONFIG.pageHeroes,
      ...(input.pageHeroes ?? {}),
    },
    media: {
      ...DEFAULT_SITE_CONFIG.media,
      ...(input.media ?? {}),
      teamPhotos: {
        ...DEFAULT_SITE_CONFIG.media.teamPhotos,
        ...(input.media?.teamPhotos ?? {}),
      },
    },
  };

  const parsed = adminSiteConfigSchema.safeParse(candidate);
  if (!parsed.success) return DEFAULT_SITE_CONFIG;
  return parsed.data as SiteConfig;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) return DEFAULT_SITE_CONFIG;

  try {
    const sql = neon(DATABASE_URL);
    const rows = (await sql`
      SELECT payload
      FROM site_config
      WHERE config_key = ${SITE_CONFIG_KEY}
      LIMIT 1
    `) as { payload: unknown }[];

    if (!rows[0]) return DEFAULT_SITE_CONFIG;
    return mergeWithDefaults(rows[0].payload);
  } catch (error) {
    logServerEvent("site_config_fallback", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return DEFAULT_SITE_CONFIG;
  }
}

export async function getAdminSiteConfigState(): Promise<{
  configured: boolean;
  schemaMissing?: boolean;
  config: SiteConfig;
}> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) {
    return { configured: false, config: DEFAULT_SITE_CONFIG };
  }

  try {
    const sql = neon(DATABASE_URL);
    const rows = (await sql`
      SELECT payload
      FROM site_config
      WHERE config_key = ${SITE_CONFIG_KEY}
      LIMIT 1
    `) as { payload: unknown }[];
    return {
      configured: true,
      config: rows[0] ? mergeWithDefaults(rows[0].payload) : DEFAULT_SITE_CONFIG,
    };
  } catch (error) {
    logServerEvent("admin_site_config_read_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return {
      configured: true,
      schemaMissing: true,
      config: DEFAULT_SITE_CONFIG,
    };
  }
}

export async function saveAdminSiteConfig(
  payload: AdminSiteConfigPayload,
  actor: string,
): Promise<SiteConfig> {
  const sql = getSql();
  const normalized = mergeWithDefaults(payload);

  await sql`
    INSERT INTO site_config (config_key, payload, updated_by, updated_at)
    VALUES (${SITE_CONFIG_KEY}, ${JSON.stringify(normalized)}::jsonb, ${actor}, now())
    ON CONFLICT (config_key)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
  `;

  return normalized;
}
