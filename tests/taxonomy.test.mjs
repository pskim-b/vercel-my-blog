import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPost, createTaxonomy, taxonomy, validateTaxonomy } from "../src/lib/taxonomy.mjs";

test("section access is configured in taxonomy and applies even to public posts and conflicts", () => {
  const classifier = createTaxonomy(taxonomy);
  assert.equal(classifier.canAccessSection("journal", false), false);
  assert.equal(classifier.canAccessSection("journal", true), true);
  assert.equal(classifier.canAccessSection("tech", false), true);
  assert.equal(classifier.canAccessSection("unknown", false), false);
  const post = { isPublic: true, label: ["journal"] };
  assert.equal(classifier.canAccessPost(post, false), false);
  assert.equal(classifier.canAccessPost(post, true), true);
  assert.equal(classifier.canAccessPost({ ...post, label: ["journal", "kafka"] }, false), false);
  assert.equal(classifier.canAccessPost({ isPublic: false, label: ["kafka"] }, false), false);
  const publicJournal = structuredClone(taxonomy);
  publicJournal.sections.find(section => section.id === "journal").access = "public";
  assert.equal(createTaxonomy(publicJournal).canAccessPost(post, false), true);
  const invalid = structuredClone(taxonomy);
  invalid.sections[0].access = "sometimes";
  assert.ok(validateTaxonomy(invalid).some(error => error.includes("access")));
});

test("source metadata alone never makes an AI technology post", () => {
  const result = classifyPost({ category: "note", label: ["ai-generated", "chat-log", "idea", "clip", "feedback"] });
  assert.equal(result.section, "unclassified");
  assert.deepEqual(result.topicPaths, []);
  assert.deepEqual(result.unknownLabels, []);
});

test("known labels classify new posts and retain only the most specific topic path", () => {
  const result = classifyPost({ category: "note", label: [" KAFKA ", "kafka-consumer", "kafka-rebalancing", "kafka"] });
  assert.equal(result.section, "tech");
  assert.deepEqual(result.topicPaths, ["kafka/consumer/rebalancing"]);
  assert.deepEqual(result.issues, []);
  assert.equal(classifyPost({ label: ["redis"] }).section, "tech");
});

test("multiple knowledge topics in the same section are valid", () => {
  const result = classifyPost({ label: ["java", "kafka-offset"] });
  assert.equal(result.section, "tech");
  assert.deepEqual(result.topicPaths, ["java", "kafka/consumer/offset"]);
});

test("unknown labels alone go to unclassified and are preserved", () => {
  const result = classifyPost({ label: [" NEW-LABEL ", "new-label", "__proto__", "constructor"] });
  assert.equal(result.section, "unclassified");
  assert.deepEqual(result.unknownLabels, ["new-label", "__proto__", "constructor"]);
});

test("an unknown supplementary label does not block a valid section", () => {
  const result = classifyPost({ label: ["kafka", "new-label", "ai-generated"] });
  assert.equal(result.section, "tech");
  assert.deepEqual(result.unknownLabels, ["new-label"]);
  assert.deepEqual(result.issues, []);
});

test("ambiguous major sections and conflicting legacy categories go to unclassified", () => {
  for (const post of [{ label: ["kafka", "running"] }, { category: "lifelog", label: ["running"] }, { category: "book", label: ["java"] }]) {
    const result = classifyPost(post);
    assert.equal(result.section, "unclassified");
    assert.ok(result.issues.some(issue => issue.code === "conflicting-sections"));
  }
});

test("legacy categories provide explicit fallback without inferring note content", () => {
  assert.equal(classifyPost({ category: "book" }).section, "reflections");
  assert.equal(classifyPost({ category: "Design pattern" }).section, "tech");
  assert.equal(classifyPost({ category: "lifelog" }).section, "journal");
  assert.equal(classifyPost({ category: "note" }).section, "unclassified");
  assert.equal(classifyPost({ category: "__proto__" }).section, "unclassified");
  assert.ok(classifyPost({ category: "study" }).issues.some(issue => issue.code === "missing-topic"));
});

test("writing requires a known type and rejects conflicting project types", () => {
  assert.ok(classifyPost({ label: ["WRITTING"] }).issues.some(issue => issue.code === "missing-type"));
  const result = classifyPost({ label: ["writing", "project:writing-and-thought"] });
  assert.equal(result.section, "writing");
  assert.equal(result.type, "writing-and-thought");
  assert.ok(classifyPost({ label: ["project:writing-and-thought", "project:poetry"] }).issues.some(issue => issue.code === "conflicting-type"));
});

test("a section with incompatible subtypes waits for relabeling", () => {
  assert.equal(classifyPost({ label: ["book", "movie"] }).section, "unclassified");
  assert.equal(classifyPost({ label: ["running", "swimming"] }).section, "unclassified");
  assert.equal(classifyPost({ label: ["speaking"] }).section, "journal");
});

test("registering a new label in data reclassifies the same post without modifying it", () => {
  const post = { category: "note", label: ["new-database"] };
  const original = structuredClone(post);
  assert.equal(classifyPost(post).section, "unclassified");
  const extended = structuredClone(taxonomy);
  extended.labelsBySection.tech.labels["new-database"] = { title: "New database", topicPaths: ["databases/new-database"] };
  const classifier = createTaxonomy(extended);
  assert.equal(classifier.classifyPost(post).section, "tech");
  assert.deepEqual(classifier.classifyPost(post).unknownLabels, []);
  assert.deepEqual(post, original);
});

test("new projects can be defined entirely in the catalog", () => {
  const extended = structuredClone(taxonomy);
  extended.labelsBySection.writing.types["new-project"] = { title: "New project" };
  extended.labelsBySection.writing.labels["project:new-project"] = { title: "New project", type: "new-project" };
  const result = createTaxonomy(extended).classifyPost({ label: ["project:new-project"] });
  assert.equal(result.section, "writing");
  assert.equal(result.type, "new-project");
});

test("bad definitions fail validation, while content problems remain non-blocking", () => {
  assert.deepEqual(validateTaxonomy(taxonomy), []);
  for (const mutate of [
    config => { config.labelsBySection.tech.labels.kafka.topicPaths = ["one/two/three/four"]; },
    config => { config.labelsBySection.unknown = { types: {}, labels: {}, legacyCategories: {} }; },
    config => { config.labelsBySection.tech.labels.kafka.aliases = ["writing"]; },
    config => { config.labelsBySection.tech.labels.kafka.aliases = ["runing"]; config.labelsBySection.exercise.labels.running.aliases.push("RUNING"); },
    config => { config.sharedLabels["ai-generated"].section = "tech"; },
    config => { config.labelsBySection.writing.labels["project:poetry"].type = "unknown"; },
    config => { config.labelsBySection.tech.labels.kafka.topicPaths = ["/kafka"]; },
    config => { config.labelsBySection.tech.labels.kafka.type = "book"; },
    config => { config.labelsBySection.exercise.labels.kafka = { title: "Duplicate Kafka" }; },
    config => { config.labelsBySection.journal.legacyCategories.book = {}; },
    config => { config.labelsBySection.unclassified.labels.other = { title: "Other" }; },
    config => { config.labelsBySection.reflections.labels.book.kind = "book"; },
  ]) {
    const config = structuredClone(taxonomy);
    mutate(config);
    assert.ok(validateTaxonomy(config).length);
    assert.throws(() => createTaxonomy(config), /Invalid taxonomy/);
  }
  assert.doesNotThrow(() => classifyPost({ label: ["unknown"] }));
});

test("all sections use the same type field and inherit their containing section", () => {
  for (const [label, section, type] of [
    ["book", "reflections", "book"], ["running", "exercise", "running"],
    ["project:poetry", "writing", "poetry"], ["speaking", "journal", "language-practice"],
  ]) {
    const result = classifyPost({ label: [label] });
    assert.equal(result.section, section);
    assert.equal(result.type, type);
    for (const oldField of ["kind", "sport", "projectId", "journalKind"]) assert.equal(oldField in result, false);
    assert.equal("section" in taxonomy.labelsBySection[section].labels[label], false);
  }
});

test("type IDs are local to a section and requirements come from section definitions", () => {
  const extended = structuredClone(taxonomy);
  extended.labelsBySection.journal.types.book = { title: "독서 일기" };
  extended.labelsBySection.journal.labels["reading-diary"] = { title: "독서 일기", type: "book" };
  assert.equal(createTaxonomy(extended).classifyPost({ label: ["reading-diary"] }).section, "journal");
  extended.sections.find(section => section.id === "journal").requires = ["type"];
  const classifier = createTaxonomy(extended);
  assert.equal(classifier.classifyPost({ label: ["journal"] }).section, "unclassified");
  assert.equal(classifier.classifyPost({ label: ["speaking"] }).section, "journal");
});

test("classification leaves public/private authorization and post data untouched", () => {
  const post = { scope: "private", isPublic: false, slug: "note/private", label: ["kafka"] };
  const original = structuredClone(post);
  const result = classifyPost(post);
  assert.equal(result.section, "tech");
  assert.equal("isPublic" in result, false);
  assert.deepEqual(post, original);
});
