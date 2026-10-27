import { test } from "node:test";
import assert from "node:assert/strict";
import { compactPreview, textPalette } from "../src/lib/post-presentation.mjs";

test("previews normalize whitespace and fit 30 graphemes including ellipsis", () => {
  assert.equal(compactPreview("  짧은\n  미리보기  "), "짧은 미리보기");
  assert.equal(compactPreview(""), "");
  assert.equal(compactPreview("가".repeat(30)), "가".repeat(30));
  assert.equal(compactPreview("가".repeat(31)), "가".repeat(29) + "…");
  assert.equal(compactPreview("👨‍👩‍👧‍👦".repeat(31)), "👨‍👩‍👧‍👦".repeat(29) + "…");
});

test("hash colors are deterministic, varied, and muted for backgrounds", () => {
  assert.deepEqual(textPalette("study"), textPalette("study"));
  const palettes = ["study", "note", "book", "poem", "ai-generated"].map(textPalette);
  assert.equal(new Set(palettes.map(p => p.color)).size, palettes.length);
  assert.ok(palettes.every(p => p.background.endsWith(", 0.11)")));
  for (const palette of palettes) {
    const channels = palette.color.match(/\d+/g).map(Number);
    assert.ok(channels.every(channel => channel >= 144 && channel <= 255));
  }
});
