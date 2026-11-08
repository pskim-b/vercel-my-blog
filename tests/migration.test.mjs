import { test } from "node:test";
import assert from "node:assert/strict";
import { withMigrationMetadata } from "../src/lib/migration.mjs";
import { parseContent } from "../src/lib/content.mjs";
import { injectPostMetadata } from "../src/lib/html-document.mjs";
import { archiveYears, datePointer, postYear } from "../src/lib/archive.mjs";

const original = {
  date: "2001-01-01T00:30:00+09:00",
  label: ["Writing", "ai-generated", "ai-generate"],
  migration: {
    source: "tistory",
    originalUrl: "https://example.tistory.com/entry/old?view=original#code",
    originalPublishedAt: "2001-01-01T00:30:00+09:00",
    importedAt: "2026-10-30T10:00:00+09:00",
  },
};

test("migration keeps source paths, dates and canonical source labels without AI attribution", () => {
  for (const source of ["naver", "tistory", "hugo"]) {
    const meta = withMigrationMetadata({ ...original, migration: { ...original.migration, source } });
    assert.equal(meta.date, original.date);
    assert.equal(meta.migration.originalUrl, original.migration.originalUrl);
    assert.equal(meta.migration.originalPath, "/entry/old?view=original#code");
    assert.deepEqual(meta.label, ["writing", source]);
  }
  assert.deepEqual(original.label, ["Writing", "ai-generated", "ai-generate"]);
  assert.equal(withMigrationMetadata({ date: "2026-10-30", label: ["ai-generated"] }).label[0], "ai-generated");
});

test("incomplete provenance and changed source dates fail validation", () => {
  assert.throws(() => withMigrationMetadata({ ...original, date: original.migration.importedAt }), /original published date/);
  for (const patch of [
    { source: "other" }, { originalUrl: "javascript:alert(1)" },
    { originalUrl: "https://user:secret@example.com/old" }, { originalPath: "/wrong" },
    { importedAt: "2026-10-30" }, { importedAt: undefined }, { originalPublishedAt: "2001-02-30" },
    { originalPublishedAt: "2001-01-01T00:30:00" }, { sourcePath: 123 },
  ]) assert.throws(() => withMigrationMetadata({ ...original, migration: { ...original.migration, ...patch } }));
  assert.throws(() => withMigrationMetadata({ ...original, date: "2001-02-30", migration: { ...original.migration, originalPublishedAt: "2001-02-30" } }));
  assert.equal(withMigrationMetadata({ ...original, date: "2001-01-01", migration: { ...original.migration, originalPublishedAt: "2001-01-01" } }).date, "2001-01-01");
});

test("Markdown and HTML parsing preserve imported bodies and add original links to HTML metadata", () => {
  const frontmatter = `---\ntitle: Archive\ndate: "${original.date}"\ncategory: note\ndescription: Archive\nlabel: [ai-generated]\nmigration:\n  source: tistory\n  originalUrl: "${original.migration.originalUrl}"\n  originalPublishedAt: "${original.date}"\n  importedAt: "${original.migration.importedAt}"\n---`;
  const body = '<html><head><style>.original{color:red}</style></head><body><pre><code>if (x &lt; 2) {\n  next();\n}</code></pre><img src="data:image/png;base64,AA=="><table><tr><td>1</td></tr></table><svg><path d="M0 0L10 10"/></svg></body></html>';
  for (const format of ["md", "html"]) {
    const source = format === "md" ? `${frontmatter}\n${body}` : `<!--\n${frontmatter}\n-->\n${body}`;
    const result = parseContent(source, format);
    assert.equal(result.content.trim(), body);
    assert.deepEqual(result.data.label, ["tistory"]);
    if (format === "html") {
      const output = injectPostMetadata(result.content, { ...result.data, isPublic: true });
      assert.ok(output.includes('href="https://example.tistory.com/entry/old?view=original#code"'));
      assert.ok(output.includes("원문 보기 · tistory"));
      for (const element of ["<pre><code>", '<img src="data:', "<table>", "<svg>", "<style>.original{color:red}</style>"]) assert.ok(output.includes(element));
    }
  }
});

test("archive year/month use source calendar dates across timezone and year boundaries", () => {
  assert.equal(new Date(original.date).getUTCFullYear(), 2000);
  assert.equal(postYear(original.date), "2001");
  assert.equal(datePointer(original.date), "2001년 01월");
  assert.deepEqual(archiveYears([{ date: "2001-01-01" }, { date: original.date }, { date: "1999-12-31T23:00:00-12:00" }]), [
    { value: "2001", count: 2 }, { value: "1999", count: 1 },
  ]);
});
