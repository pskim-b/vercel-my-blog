import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://localhost:3103";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const files = [];
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.locator('main a[href^="/posts/"]').first().waitFor();
    assert.equal(await page.getByRole("heading", { name: "System Design Reverie", exact: true }).count(), 1);
    assert.ok(await page.locator('main a[href^="/posts/"] p').evaluateAll(previews =>
      previews.every(preview => getComputedStyle(preview).fontWeight === "400" &&
        getComputedStyle(preview).webkitLineClamp === "2" &&
        Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(preview.textContent)).length <= 30)));
    const styles = await page.locator('main a[href^="/posts/"]').evaluateAll(cards => cards.map(card => ({
      category: card.querySelector("span[title]").textContent,
      background: getComputedStyle(card).backgroundColor,
    })));
    assert.ok(new Set(styles.map(style => style.background)).size > 1);
    await page.screenshot({ path: `/tmp/blog-list-${width}.png`, fullPage: true });
  }
  const labels = [[], ["ai-generated"], ["ai-generated", "a".repeat(200), "third-label", "fourth-label"]];
  for (const [index, label] of labels.entries()) {
    const file = new URL(`../posts/__list-layout-test-${index}.md`, import.meta.url);
    const title = index === 2 ? "LongTitle".repeat(20) : `Layout test ${index}`;
    fs.writeFileSync(file, `---\ntitle: ${JSON.stringify(title)}\ndate: "2026-10-28"\ncategory: "layout-test-category"\nlabel: ${JSON.stringify(label)}\nscope: public\n---\nPreview ${"LongPreview".repeat(20)}\n`, { flag: "wx" });
    files.push(file);
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/?category=layout-test-category`);
    const cards = page.locator('main a[href^="/posts/__list-layout-test-"]');
    assert.equal(await cards.count(), 3);
    const layout = await cards.evaluateAll(cards => cards.map(card => {
      const meta = card.firstElementChild;
      const title = card.querySelector("h2");
      const preview = card.querySelector("p");
      const rect = element => element.getBoundingClientRect();
      return { width: rect(card).width, metaHeight: rect(meta).height,
        metaBottom: rect(meta).bottom, titleTop: rect(title).top,
        titleLeft: rect(title).left, metaLeft: rect(meta).left,
        titleBottom: rect(title).bottom, previewTop: rect(preview).top,
        scroll: card.scrollWidth, client: card.clientWidth };
    }));
    assert.ok(layout.every(card => card.metaHeight === 24));
    assert.ok(layout.every(card => card.titleTop >= card.metaBottom && card.previewTop >= card.titleBottom));
    assert.ok(layout.every(card => card.titleLeft === card.metaLeft));
    assert.ok(layout.every(card => card.scroll <= card.client));
    assert.ok(layout.every(card => card.width === layout[0].width));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const truncated = cards.nth(2).locator("[data-post-labels]");
    assert.ok((await truncated.getAttribute("title")).includes("a".repeat(200)));
    const firstColor = await cards.nth(1).locator('[data-post-label]').first().evaluate(label => getComputedStyle(label).color);
    const repeatedColor = await cards.nth(2).locator('[data-post-label]').first().evaluate(label => getComputedStyle(label).color);
    assert.equal(firstColor, repeatedColor);
    const cardColors = await cards.evaluateAll(cards => cards.map(card => getComputedStyle(card).backgroundColor));
    assert.equal(new Set(cardColors).size, 1);
    console.log(`PASS: ${width}px uniform single-line metadata, full-width title/preview, long labels and text contained`);
  }
  const privateFile = new URL("../posts/__list-layout-test-private.md", import.meta.url);
  fs.writeFileSync(privateFile, '---\ntitle: "Private layout test"\ndate: "2026-10-28"\ncategory: "layout-test-category"\nscope: private\nlabel: ["ai-generated"]\n---\nPrivate preview\n', { flag: "wx" });
  files.push(privateFile);
  await page.goto(`${base}/?category=layout-test-category`);
  assert.equal(await page.locator('a[href="/posts/__list-layout-test-private"]').count(), 0);
  const login = await page.context().request.post(`${base}/api/auth/login`, {
    form: { password: "local-html-test", next: "/" }, maxRedirects: 0,
  });
  assert.equal(login.status(), 303);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/?category=layout-test-category`);
    const privateCard = page.locator('a[href="/posts/__list-layout-test-private"]');
    const lock = privateCard.getByRole("img", { name: "비공개 글" });
    assert.ok(await lock.isVisible());
    const publicCard = page.locator('a[href="/posts/__list-layout-test-0"]');
    assert.equal(await publicCard.getByRole("img", { name: "비공개 글" }).count(), 0);
    assert.equal(await privateCard.evaluate(card => getComputedStyle(card).backgroundColor),
      await publicCard.evaluate(card => getComputedStyle(card).backgroundColor));
    const cardBox = await privateCard.boundingBox();
    const lockBox = await lock.boundingBox();
    assert.ok(Math.abs(cardBox.x + cardBox.width - lockBox.x - lockBox.width - 17) <= 1);
    assert.ok(Math.abs(lockBox.y - cardBox.y - 17) <= 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    console.log(`PASS: ${width}px private lock at top right, category tint retained, public cards unlocked`);
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/`);
    await page.screenshot({ path: `/tmp/blog-list-private-${width}.png`, fullPage: true });
  }
} finally {
  await browser?.close();
  for (const file of files) fs.unlinkSync(file);
}
