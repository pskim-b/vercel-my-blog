import { normalizeLabels } from "./labels.mjs";

export const migrationSources = ["naver", "tistory", "hugo"];

function publishedDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10);
}

// Imported content keeps its own date; import time is separate provenance.
export function withMigrationMetadata(data) {
  if (data.migration === undefined) return data;
  const migration = data.migration;
  if (!migration || typeof migration !== "object" || Array.isArray(migration)) {
    throw new Error("Invalid migration metadata");
  }
  if (!migrationSources.includes(migration.source)) throw new Error("Invalid migration source");
  if (typeof migration.originalUrl !== "string") throw new Error("Invalid migration originalUrl");
  let original;
  try { original = new URL(migration.originalUrl); } catch { throw new Error("Invalid migration originalUrl"); }
  if (!["https:", "http:"].includes(original.protocol) || original.username || original.password) {
    throw new Error("Invalid migration originalUrl");
  }
  if (!publishedDate(migration.originalPublishedAt) || data.date !== migration.originalPublishedAt) {
    throw new Error("Migration date must equal the original published date, including its precision and timezone");
  }
  if (!publishedDate(migration.importedAt) || !migration.importedAt.includes("T")) {
    throw new Error("Migration importedAt requires a timestamp with timezone");
  }
  const originalPath = original.pathname + original.search + original.hash;
  if (migration.originalPath !== undefined && migration.originalPath !== originalPath) {
    throw new Error("Migration originalPath does not match originalUrl");
  }
  for (const key of ["originalId", "sourcePath"]) {
    if (migration[key] !== undefined && (typeof migration[key] !== "string" || !migration[key].trim())) {
      throw new Error(`Invalid migration ${key}`);
    }
  }
  return {
    ...data,
    label: [...new Set([...normalizeLabels(data.label)
      .filter(label => !["ai-generate", "ai-generated"].includes(label)), migration.source])],
    migration: { ...migration, originalPath },
  };
}
