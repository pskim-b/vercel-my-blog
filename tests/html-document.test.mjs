import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "parse5";
import { injectPostMetadata } from "../src/lib/html-document.mjs";

const meta = { title: "Title", date: "2026-10-27", category: "study", label: ["ai-generated"],
  description: "Description", isPublic: true };

function nodes(node) {
  return [node, ...(node.childNodes ?? []).flatMap(nodes), ...(node.content ? nodes(node.content) : [])];
}

test("injects one isolated metadata bar and head metadata without changing source styles/scripts", () => {
  const css = '<style>nav{display:none} body{color:red}</style>';
  const js = '<script>const text = "<body><psnote-meta></psnote-meta>";</script>';
  const result = injectPostMetadata(`<!doctype html><html><head>${css}${js}</head><body><h1>Original</h1></body></html>`, meta);
  assert.ok(result.includes(css));
  assert.ok(result.includes(js));
  const all = nodes(parse(result));
  assert.equal(all.filter(node => node.tagName === "psnote-meta").length, 1);
  assert.equal(all.filter(node => node.tagName === "h1").length, 1);
  assert.ok(result.includes('shadowrootmode="open"'));
  assert.ok(result.includes('<meta name="description" content="Description">'));
  assert.ok(result.includes('<meta property="og:title" content="Title">'));
  assert.ok(!result.includes('class="private">private'));
});

test("respects a real placeholder rather than fake tags in comments or scripts", () => {
  const source = '<html><head></head><body><!-- <psnote-meta></psnote-meta> --><main><h1>Title</h1><psnote-meta></psnote-meta><p>Body</p></main></body></html>';
  const result = injectPostMetadata(source, { ...meta, isPublic: false });
  assert.ok(result.indexOf('<h1>Title</h1>') < result.indexOf('<psnote-meta lang='));
  assert.ok(result.indexOf('</psnote-meta><p>Body</p>') > 0);
  assert.ok(result.includes('class="private">private'));
});

test("escapes metadata including template/script breakouts and safely encodes filter URLs", () => {
  const attack = '</template><script>alert("x")</script>';
  const result = injectPostMetadata('<html><head></head><body></body></html>', {
    ...meta, title: attack, category: 'a&b"', label: [attack], description: attack,
  });
  const all = nodes(parse(result));
  assert.equal(all.filter(node => node.tagName === "script").length, 0);
  assert.ok(result.includes('&lt;/template&gt;'));
  assert.ok(result.includes('/?category=a%26b%22'));
});

test("preserves author-provided head metadata", () => {
  const source = '<html><head><meta name="description" content="Original"><meta property="og:title" content="Custom"></head><body></body></html>';
  const result = injectPostMetadata(source, meta);
  const all = nodes(parse(result));
  assert.equal(all.filter(node => node.tagName === "meta" && node.attrs.some(attr => attr.value === "description")).length, 1);
  assert.ok(result.includes('content="Original"'));
  assert.ok(result.includes('content="Custom"'));
});
