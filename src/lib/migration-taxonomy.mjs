export function validateMigrationTaxonomy(value, config) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid migration taxonomy assignment");
  const section = config.sections.find(section => section.id === value.section);
  if (!section) throw new Error("Unknown migration target section");
  const types = config.labelsBySection[section.id].types;
  const type = value.type || null;
  if (type && !Object.hasOwn(types, type)) throw new Error("Unknown migration target type");
  if (section.requires.includes("type") && !type) throw new Error("Missing migration target type");
  if (!Array.isArray(value.topicPaths ?? [])) throw new Error("Invalid migration target topic paths");
  const topicPaths = [...new Set(value.topicPaths ?? [])];
  if (topicPaths.some(topic => typeof topic !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/.test(topic))) {
    throw new Error("Invalid migration target topic path");
  }
  if (section.requires.includes("topicPaths") && !topicPaths.length) throw new Error("Missing migration target topic path");
  return { section: section.id, type, topicPaths: topicPaths.filter(topic => !topicPaths.some(other => other.startsWith(topic + "/"))) };
}
