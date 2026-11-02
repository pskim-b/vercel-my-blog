import taxonomy from "../../config/taxonomy.json" with { type: "json" };

const baseLabel = value => typeof value === "string" ? value.normalize("NFC").trim().toLowerCase() : "";
const has = (object, key) => Object.hasOwn(object, key);
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const sharedRoles = new Set(["provenance", "format", "state", "supplementary"]);
const mappingFields = ["section", "role", "kind", "sport", "projectId", "journalKind"];

/** Invalid definitions are configuration errors; unknown post labels are not. */
export function validateTaxonomy(config) {
  const errors = [];
  if (config?.version !== 2) errors.push("version must be 2");
  if (!Array.isArray(config?.sections) || !config.sections.length) errors.push("sections must be a nonempty array");
  if (!isRecord(config?.labelsBySection)) errors.push("labelsBySection must be an object");
  if (!isRecord(config?.sharedLabels)) errors.push("sharedLabels must be an object");
  if (errors.length) return errors;
  for (const field of ["reviewKinds", "sports", "projects", "labels", "legacyCategories"]) {
    if (has(config, field)) errors.push(`${field}: use section-local types and labels`);
  }
  const sections = new Set();
  for (const section of config.sections) {
    if (!isRecord(section) || !/^[a-z][a-z-]*$/.test(section.id) || !section.title || !section.view) {
      errors.push("each section needs an id, title and view");
      continue;
    }
    if (sections.has(section.id)) errors.push(`duplicate section: ${section.id}`);
    sections.add(section.id);
    if (!Array.isArray(section.requires) || section.requires.some(field => !["type", "topicPaths"].includes(field))) errors.push(`${section.id}: requires supports type and topicPaths`);
    if (!has(config.labelsBySection, section.id)) errors.push(`${section.id}: labelsBySection entry is required`);
  }
  if (!sections.has("unclassified")) errors.push("unclassified section is required");
  const names = new Map();
  const entries = [];
  const addLabel = (id, definition, section) => {
    if (!id || baseLabel(id) !== id) errors.push(`label id must be canonical: ${id}`);
    if (names.has(id)) errors.push(`duplicate label across sections: ${id}`);
    names.set(id, id);
    entries.push({ id, definition, section });
  };
  const checkMapping = (mapping, name, types) => {
    if (!isRecord(mapping)) { errors.push(`${name}: mapping must be an object`); return; }
    for (const field of mappingFields) if (has(mapping, field)) errors.push(`${name}: ${field} is inherited or replaced by type`);
    if (has(mapping, "type") && (typeof mapping.type !== "string" || !has(types, mapping.type))) errors.push(`${name}: unknown type ${mapping.type}`);
    if (mapping.topicPaths !== undefined) {
      if (!Array.isArray(mapping.topicPaths)) errors.push(`${name}: topicPaths must be an array`);
      else for (const path of mapping.topicPaths) {
        if (typeof path !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/.test(path)) errors.push(`${name}: invalid topic path (maximum 3 levels): ${path}`);
      }
    }
  };
  for (const [section, group] of Object.entries(config.labelsBySection)) {
    if (!sections.has(section)) errors.push(`unknown section group: ${section}`);
    if (!isRecord(group) || !["types", "labels", "legacyCategories"].every(field => isRecord(group[field]))) {
      errors.push(`${section}: types, labels and legacyCategories must be objects`);
      continue;
    }
    for (const [id, type] of Object.entries(group.types)) {
      if (!id || baseLabel(id) !== id || !isRecord(type) || !type.title) errors.push(`${section}: each type needs a canonical id and title`);
    }
    if (section === "unclassified" && [group.types, group.labels, group.legacyCategories].some(value => Object.keys(value).length)) errors.push("unclassified is a fallback, not an assignable label group");
    for (const [id, definition] of Object.entries(group.labels)) {
      addLabel(id, definition, section);
      checkMapping(definition, `${section}/${id}`, group.types);
    }
    for (const [id, mapping] of Object.entries(group.legacyCategories)) checkMapping(mapping, `${section}/category:${id}`, group.types);
  }
  for (const [id, definition] of Object.entries(config.sharedLabels)) {
    addLabel(id, definition, null);
    if (!isRecord(definition) || !sharedRoles.has(definition.role)) errors.push(`${id}: unknown shared role`);
    if (isRecord(definition) && ["section", "type", "topicPaths", "kind", "sport", "projectId", "journalKind"].some(field => has(definition, field))) errors.push(`${id}: shared labels cannot choose a section or type`);
  }
  for (const { id, definition } of entries) {
    if (!isRecord(definition)) continue;
    if (!definition.title) errors.push(`${id}: title is required`);
    if (definition.aliases !== undefined && !Array.isArray(definition.aliases)) { errors.push(`${id}: aliases must be an array`); continue; }
    for (const alias of definition.aliases ?? []) {
      const normalized = baseLabel(alias);
      if (!normalized) errors.push(`${id}: empty alias`);
      if (names.has(normalized) && names.get(normalized) !== id) errors.push(`${id}: alias already belongs to ${names.get(normalized)}: ${alias}`);
      names.set(normalized, id);
    }
  }
  const categories = new Set();
  for (const group of Object.values(config.labelsBySection)) {
    if (!isRecord(group?.legacyCategories)) continue;
    for (const id of Object.keys(group.legacyCategories)) {
      if (baseLabel(id) !== id || (names.has(id) && names.get(id) !== id)) errors.push(`legacy category must use a canonical id: ${id}`);
      if (categories.has(id)) errors.push(`duplicate legacy category across sections: ${id}`);
      categories.add(id);
    }
  }
  return errors;
}

export function createTaxonomy(config) {
  const errors = validateTaxonomy(config);
  if (errors.length) throw new Error(`Invalid taxonomy:\n${errors.join("\n")}`);
  const definitions = new Map(Object.entries(config.sharedLabels));
  const legacy = new Map();
  const sections = new Map(config.sections.map(section => [section.id, section]));
  for (const [section, group] of Object.entries(config.labelsBySection)) {
    for (const [id, definition] of Object.entries(group.labels)) definitions.set(id, { ...definition, section, role: "content" });
    for (const [id, mapping] of Object.entries(group.legacyCategories)) legacy.set(id, { ...mapping, section });
  }
  const aliases = new Map();
  for (const [id, definition] of definitions) {
    for (const alias of definition.aliases ?? []) aliases.set(baseLabel(alias), id);
  }
  const normalizeLabel = value => {
    const normalized = baseLabel(value);
    return aliases.get(normalized) ?? normalized;
  };
  const normalizeLabels = value => [...new Set((Array.isArray(value) ? value : [value]).map(normalizeLabel).filter(Boolean))];

  /** Classifies only metadata. Authorization must run before counts or lists. */
  function classifyPost(post) {
    const labels = normalizeLabels(post.label);
    const unknownLabels = labels.filter(label => !definitions.has(label));
    const mappings = labels.filter(label => definitions.has(label)).map(label => definitions.get(label)).filter(mapping => mapping.section);
    const category = normalizeLabel(post.category);
    if (legacy.has(category)) mappings.push(legacy.get(category));
    const candidates = [...new Set(mappings.map(mapping => mapping.section))];
    const issues = [];
    let section = candidates.length === 1 ? candidates[0] : "unclassified";
    if (!candidates.length) issues.push({ code: "missing-section", message: "대분류를 결정할 내용 라벨이 필요합니다." });
    if (candidates.length > 1) issues.push({ code: "conflicting-sections", message: "서로 다른 대분류의 라벨 또는 기존 카테고리가 함께 있습니다." });
    const paths = [...new Set(mappings.flatMap(mapping => mapping.topicPaths ?? []))];
    const topicPaths = paths.filter(path => !paths.some(other => other.startsWith(`${path}/`)));
    // Type IDs are section-local; compare them only after choosing one section.
    const types = candidates.length === 1 ? [...new Set(mappings.map(mapping => mapping.type).filter(Boolean))] : [];
    const type = types.length === 1 ? types[0] : null;
    if (types.length > 1) issues.push({ code: "conflicting-type", message: "같은 섹션에서 서로 다른 세부 유형이 지정되어 있습니다." });
    const definition = sections.get(section);
    for (const field of definition.requires) {
      if (field === "topicPaths" && !topicPaths.length) issues.push({ code: "missing-topic", message: `${definition.title} 토픽 라벨이 필요합니다.` });
      if (field === "type" && !type) issues.push({ code: "missing-type", message: `${definition.title}의 세부 유형을 지정할 라벨이 필요합니다.` });
    }
    if (issues.length) section = "unclassified";
    return { section, type, labels, topicPaths, candidates, issues, unknownLabels };
  }
  return { normalizeLabel, normalizeLabels, classifyPost, labelDefinitions: Object.fromEntries(definitions) };
}

const classifier = createTaxonomy(taxonomy);
export const { normalizeLabel, normalizeLabels, classifyPost, labelDefinitions } = classifier;
export const taxonomySections = taxonomy.sections;
export { taxonomy };
