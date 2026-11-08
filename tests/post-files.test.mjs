import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { indexPostSources } from "../src/lib/post-files.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-private-sources-"));
  const publicRoot = path.join(root, "repository/posts");
  const privateRoot = path.join(root, "private-posts");
  fs.mkdirSync(publicRoot, { recursive: true });
  fs.mkdirSync(privateRoot);
  return { root, publicRoot, privateRoot };
}

test("private source provenance survives even a public-looking folder and metadata", () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.publicRoot, "public.md"), "# Public");
    fs.mkdirSync(path.join(f.privateRoot, "book"));
    fs.writeFileSync(path.join(f.privateRoot, "book/private.md"), "---\nscope: public\n---\n# Private");
    const index = indexPostSources(f);
    assert.equal(index.get("public").privateSource, false);
    assert.equal(index.get("book/private").privateSource, true);
    assert.equal(index.size, 2);
    assert.equal(indexPostSources({ publicRoot: f.publicRoot }).size, 1);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test("private sources inside the public repository and ambiguous slugs fail closed", () => {
  const f = fixture();
  try {
    const inside = path.join(f.root, "repository/private-content");
    fs.mkdirSync(inside);
    assert.throws(() => indexPostSources({ ...f, privateRoot: inside }), /outside the public source repository/);
    assert.throws(() => indexPostSources({ ...f, privateRoot: "relative" }), /absolute path/);
    fs.writeFileSync(path.join(f.publicRoot, "same.md"), "# Public");
    fs.writeFileSync(path.join(f.privateRoot, "same.html"), "Private");
    assert.throws(() => indexPostSources(f), /Duplicate public\/private post slug/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});
