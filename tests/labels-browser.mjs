import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://localhost:3103";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const files = [];
let browser;
try {
  for (const [name, scope, format] of [["markdown", "public", "md"], ["html", "public", "html"], ["private", "private", "md"]]) {
    const file = new URL(`../posts/__label-test-${name}.${format}`, import.meta.url);
    const frontmatter = `---\ntitle: "Label test ${name}"\ndate: "2026-10-28"\ncategory: "label-test"\nscope: ${scope}\nlabel: [" Writing ", "WRITTING", "writing", "ChatLog", "chat-log"]\ndescription: "Label test preview"\n---`;
    const content = format === "html" ? `<!--\n${frontmatter}\n-->\n<!doctype html><html><head><title>Test</title></head><body><h1>Label test HTML</h1></body></html>` : `${frontmatter}\nLabel test preview`;
    fs.writeFileSync(file, content, { flag: "wx" });
    files.push(file);
  }
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  let expected;
  for (const label of ["writing", "Writing", "WRITING", "writting", " WRITTING "]) {
    await page.goto(`${base}/?label=${encodeURIComponent(label)}`);
    const links = await page.locator('main a[href^="/posts/"]').evaluateAll(cards => cards.map(card => card.getAttribute("href")).sort());
    if (expected) assert.deepEqual(links, expected); else expected = links;
    assert.ok(links.includes("/posts/__label-test-markdown"));
    assert.ok(links.includes("/posts/__label-test-html"));
    assert.ok(!links.includes("/posts/__label-test-private"));
    const card = page.locator('a[href="/posts/__label-test-markdown"]');
    assert.deepEqual(await card.locator("[data-post-label]").allTextContents(), ["writing", "chat-log"]);
    await page.getByRole("button", { name: "Browse categories and labels" }).click();
    const writing = page.locator('#post-filter-menu a[href="/?label=writing"]');
    assert.equal(await writing.count(), 1);
    assert.equal(await writing.locator("span").textContent(), String(expected.length));
    assert.equal(await page.locator('#post-filter-menu a[href="/?label=writting"]').count(), 0);
  }
  let chatPosts;
  for (const label of ["chat-log", "ChatLog", "CHAT-LOG"]) {
    await page.goto(`${base}/?label=${encodeURIComponent(label)}`);
    const links = await page.locator('main a[href^="/posts/"]').evaluateAll(cards => cards.map(card => card.getAttribute("href")).sort());
    if (chatPosts) assert.deepEqual(links, chatPosts); else chatPosts = links;
  }
  await page.goto(`${base}/posts/__label-test-html`);
  const metadata = page.getByRole("navigation", { name: "글 메타정보" });
  assert.equal(await metadata.getByRole("link", { name: "writing", exact: true }).getAttribute("href"), "/?label=writing");
  assert.equal(await metadata.getByRole("link", { name: "chat-log", exact: true }).count(), 1);
  const login = await context.request.post(`${base}/api/auth/login`, { form: { password: "local-html-test", next: "/" }, maxRedirects: 0 });
  assert.equal(login.status(), 303);
  await page.goto(`${base}/?label=WRITTING`);
  assert.equal(await page.locator('a[href="/posts/__label-test-private"]').count(), 1);
  console.log("PASS: case/typo filters match, canonical menu counts, per-post deduplication, Markdown/HTML metadata, private visibility");
} finally {
  await browser?.close();
  for (const file of files) fs.unlinkSync(file);
}
