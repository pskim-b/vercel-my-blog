import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFragment } from "parse5";
import { highlightCode } from "../src/lib/code-highlight.mjs";

// Read the generated HTML as the browser does, including numeric entities.
function sourceText(html) {
  function text(node) {
    return node.nodeName === "#text" ? node.value : (node.childNodes ?? []).map(text).join("");
  }
  return text(parseFragment(html));
}

test("highlighting preserves whitespace and source while emitting both theme palettes", async () => {
  const source = 'const value = "<script>& safe";\n\tconsole.log(value);\n';
  const html = await highlightCode(source, "JS");
  assert.equal(sourceText(html), source);
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
  assert.ok((html.match(/style=/g) ?? []).length > 2);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /tabindex="0"/);
});

test("unlabelled and unsupported languages remain escaped plain text", async () => {
  const source = '<script>alert("test")</script>\n    next line';
  for (const language of ["", "text", "unknown-language", "__proto__"]) {
    const html = await highlightCode(source, language);
    assert.equal(sourceText(html), source);
    assert.doesNotMatch(html, /<script>/);
  }
});
