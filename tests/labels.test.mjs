import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLabel, normalizeLabels } from "../src/lib/labels.mjs";

test("labels ignore case and surrounding whitespace", () => {
  assert.equal(normalizeLabel(" Writing "), "writing");
  assert.equal(normalizeLabel("AI-GENERATED"), "ai-generated");
  assert.equal(normalizeLabel("\u1100\u1161"), "가");
});

test("known aliases work case-insensitively but unknown labels stay distinct", () => {
  assert.equal(normalizeLabel(" WRITTING "), "writing");
  assert.equal(normalizeLabel("CHATLOG"), "chat-log");
  assert.equal(normalizeLabel("running"), "running");
  assert.equal(normalizeLabel("runing"), "runing");
  assert.equal(normalizeLabel("__proto__"), "__proto__");
});

test("invalid/empty labels are removed and normalized duplicates count once per post", () => {
  assert.deepEqual(normalizeLabels(["Writing", "writting", "writing", " ", null, 1, {}, "chatlog", "chat-log"]), ["writing", "chat-log"]);
  assert.deepEqual(normalizeLabels(" WRITTING "), ["writing"]);
  assert.deepEqual(normalizeLabels(undefined), []);
  assert.deepEqual(normalizeLabels([]), []);
});
