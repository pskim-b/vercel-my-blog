import { parse } from "parse5";

function elements(node) {
  const result = [];
  if ("tagName" in node) result.push(node);
  if ("childNodes" in node) {
    for (const child of node.childNodes) result.push(...elements(child));
  }
  return result;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function metadataBar(meta) {
  const categoryUrl = `/?category=${encodeURIComponent(meta.category)}`;
  const labels = meta.label.map(label =>
    `<a class="label" href="${escapeHtml(`/?label=${encodeURIComponent(label)}`)}">${escapeHtml(label)}</a>`
  ).join("");
  return `<psnote-meta lang="ko" dir="ltr" style="all:initial!important;display:block!important;position:static!important;width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important">
<template shadowrootmode="open">
<style>
:host{color-scheme:light}
*{box-sizing:border-box}
nav{margin:0;background:#f8faf9;border-bottom:1px solid #dde4e0;color:#39463f;font:13px/1.6 system-ui,-apple-system,sans-serif;letter-spacing:0;text-align:left}
.inner{max-width:890px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;min-width:0}
a{color:#176b55;text-decoration:none;overflow-wrap:anywhere}
a:hover{text-decoration:underline}
a:focus-visible{outline:2px solid #176b55;outline-offset:3px}
.details{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;max-width:100%}
time{white-space:nowrap}
.category,.label,.private{padding:2px 7px;border-radius:4px;max-width:100%;overflow-wrap:anywhere}
.category{background:#dfeee8;color:#155940}
.label{background:#e9ecea;color:#46534b}
.private{background:#fce5e5;color:#942929}
@media(max-width:560px){.inner{padding:10px 14px}}
</style>
<nav aria-label="글 메타정보"><div class="inner">
<a href="/">블로그로 돌아가기</a>
<div class="details"><time datetime="${escapeHtml(meta.date)}">${escapeHtml(meta.date)}</time>
<a class="category" href="${escapeHtml(categoryUrl)}">${escapeHtml(meta.category)}</a>
${labels}${meta.isPublic ? "" : '<span class="private">private</span>'}</div>
</div></nav>
</template></psnote-meta>`;
}

// Parse only to locate real tags; splice the source to preserve author CSS and scripts verbatim.
export function injectPostMetadata(source, meta) {
  const nodes = elements(parse(source, { sourceCodeLocationInfo: true }));
  const body = nodes.find(node => node.tagName === "body");
  const head = nodes.find(node => node.tagName === "head");
  const marker = nodes.find(node => node.tagName === "psnote-meta" && node.sourceCodeLocation);
  const edits = [];
  const bar = metadataBar(meta);
  if (marker) {
    edits.push({ start: marker.sourceCodeLocation.startOffset, end: marker.sourceCodeLocation.endOffset, text: bar });
  } else {
    const offset = body?.sourceCodeLocation?.startTag?.endOffset ?? head?.sourceCodeLocation?.endOffset ?? 0;
    edits.push({ start: offset, end: offset, text: bar });
  }

  const existingMeta = new Set(nodes.filter(node => node.tagName === "meta").flatMap(node =>
    node.attrs.filter(attr => attr.name === "name" || attr.name === "property").map(attr => attr.value.toLowerCase())
  ));
  const headMeta = [["name", "description", meta.description], ["property", "og:title", meta.title],
    ["property", "og:description", meta.description], ["property", "og:type", "article"]]
    .filter(([, key]) => !existingMeta.has(key))
    .map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeHtml(value)}">`).join("");
  if (head?.sourceCodeLocation?.startTag) {
    const offset = head.sourceCodeLocation.startTag.endOffset;
    edits.push({ start: offset, end: offset, text: headMeta });
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}
