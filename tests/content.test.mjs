import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getContentFiles, indexContent, parseContent } from "../src/lib/content.mjs";

const demo = fs.readFileSync(new URL("./fixtures/html-demo.html", import.meta.url), "utf8");

test("HTML metadata is separated from the executable document", () => {
  const post = parseContent(demo, "html");
  assert.equal(post.data.title, "HTML interaction demo");
  assert.ok(post.content.startsWith("<!doctype html>"));
  assert.ok(post.content.includes("<script>"));
  assert.equal(parseContent(demo.replaceAll("\n", "\r\n"), "html").data.scope, "public");
});

test("invalid HTML metadata fails closed", () => {
  assert.throws(() => parseContent("<html></html>", "html"));
  assert.throws(() => parseContent(demo.replace('category: "study"', ""), "html"));
  assert.throws(() => parseContent(demo.replace('scope: public', 'scope: publi'), "html"));
  assert.throws(() => parseContent(demo.replace('2026-10-26', 'invalid'), "html"));
});

test("Markdown parsing stays compatible", () => {
  assert.equal(parseContent('---\ntitle: Test\n---\n# Body', "md").content.trim(), "# Body");
});

test("discovery excludes resources and symlinks and detects duplicate slugs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-content-"));
  try {
    fs.mkdirSync(path.join(root, "resource"));
    fs.writeFileSync(path.join(root, "resource", "hidden.html"), demo);
    fs.writeFileSync(path.join(root, "post.html"), demo);
    fs.symlinkSync(path.join(root, "post.html"), path.join(root, "link.html"));
    assert.equal(getContentFiles(root).length, 1);
    assert.ok(indexContent(root).has("post"));
    fs.writeFileSync(path.join(root, "post.md"), "# Duplicate");
    assert.throws(() => indexContent(root), /Duplicate/);
  } finally { fs.rmSync(root, { recursive: true }); }
});
