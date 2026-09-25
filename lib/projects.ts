import { safeConfig } from "./templates";

export type ProjectRecord = {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  config: ReturnType<typeof safeConfig>;
  published: boolean;
  passwordProtected: boolean;
  views: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
};

const LEGACY_PROJECT_TITLES: Record<string, string> = {
  "יצירה מאפס בהתאמה אישית": "עיצוב בהתאמה אישית",
};

export function projectFromRow(row: any): ProjectRecord {
  let parsed: unknown = null;
  try { parsed = JSON.parse(row.config_json); } catch { /* defaults below */ }
  const storedTitle = String(row.title);
  return {
    id: String(row.id), title: LEGACY_PROJECT_TITLES[storedTitle] || storedTitle, slug: String(row.slug),
    templateId: String(row.template_id), config: safeConfig(parsed, String(row.template_id)),
    published: Boolean(row.published), passwordProtected: Boolean(row.access_password_hash), views: Number(row.views || 0), clicks: Number(row.clicks || 0),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function createSlug(title: string) {
  const latin = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  return `${latin || "page"}-${crypto.randomUUID().slice(0, 6)}`;
}

export function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}
