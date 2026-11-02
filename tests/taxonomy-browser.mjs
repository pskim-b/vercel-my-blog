import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://localhost:3117";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const files = [];
let browser;
try {
  const fixtures = [
    ["unknown", ["taxonomy-new-label"], "public", "2019-01-02", "md"],
    ["private", ["taxonomy-private-label"], "private", "2019-01-02", "md"],
    ["conflict", ["kafka", "running"], "public", "2026-11-02", "md"],
    ["tech", ["kafka", "kafka-offset"], "public", "2026-11-02", "md"],
    ["auxiliary", ["kafka", "taxonomy-new-label"], "public", "2026-11-02", "md"],
    ["writing", ["writing", "project:writing-and-thought"], "public", "2026-11-02", "md"],
    ["html", ["taxonomy-new-label"], "public", "2019-01-02", "html"],
  ];
  for (const [id, labels, scope, date, format] of fixtures) {
    const file = new URL(`../posts/__taxonomy-test-${id}.${format}`, import.meta.url);
    const frontmatter = `---\ntitle: "Taxonomy test ${id}"\ndate: "${date}"\ncategory: "taxonomy-test"\nscope: ${scope}\nlabel: ${JSON.stringify(labels)}\ndescription: "Taxonomy test preview"\n---`;
    fs.writeFileSync(file, format === "html" ? `<!--\n${frontmatter}\n-->\n<!doctype html><html><head><title>Test</title></head><body><h1>Test</h1></body></html>` : `${frontmatter}\nTaxonomy test preview\n`, { flag: "wx" });
    files.push(file);
  }
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const fixtureLinks = async () => page.locator('main a[href^="/posts/__taxonomy-test-"]').evaluateAll(links => links.map(link => link.getAttribute("href")).sort());
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/?section=unclassified`);
    assert.equal(await page.getByRole("heading", { name: "미분류", exact: true }).count(), 1);
    const tabs = page.getByRole("navigation", { name: "글 대분류" });
    assert.equal(await tabs.locator("a").count(), 7);
    assert.equal(await tabs.locator('a[aria-current="page"]').getAttribute("href"), "/?section=unclassified");
    assert.deepEqual(await fixtureLinks(), ["/posts/__taxonomy-test-conflict", "/posts/__taxonomy-test-html", "/posts/__taxonomy-test-unknown"]);
    assert.ok(await page.locator('a[href="/posts/__taxonomy-test-unknown"]').getByLabel("분류 검토 사유").isVisible());
    assert.equal(await page.getByText("taxonomy-private-label", { exact: false }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const total = Number(await tabs.locator('a[href="/"] span').innerText());
    const counts = await tabs.locator('a:not([href="/"]) span').allTextContents();
    assert.equal(counts.reduce((sum, value) => sum + Number(value), 0), total);
  }
  await page.goto(`${base}/?section=unclassified&year=2019`);
  assert.deepEqual(await fixtureLinks(), ["/posts/__taxonomy-test-html", "/posts/__taxonomy-test-unknown"]);
  const yearLinks = await page.getByRole("navigation", { name: "연도별 글 인덱스" }).locator("a").evaluateAll(links => links.map(link => link.getAttribute("href")));
  assert.ok(yearLinks.every(href => new URL(href, base).searchParams.get("section") === "unclassified"));
  await page.getByRole("button", { name: "Browse categories and labels" }).click();
  const newLabelLink = page.locator('#post-filter-menu a').filter({ hasText: /^taxonomy-new-label / });
  const labelUrl = new URL(await newLabelLink.getAttribute("href"), base);
  assert.equal(labelUrl.searchParams.get("section"), "unclassified");
  assert.equal(labelUrl.searchParams.get("year"), "2019");
  await page.goto(`${base}/?section=tech&label=kafka`);
  assert.deepEqual(await fixtureLinks(), ["/posts/__taxonomy-test-auxiliary", "/posts/__taxonomy-test-tech"]);
  await page.goto(`${base}/?section=writing`);
  assert.deepEqual(await fixtureLinks(), ["/posts/__taxonomy-test-writing"]);

  // Relabel an existing file: it moves on the next request without list/code edits.
  const unknownFile = files[0];
  const original = fs.readFileSync(unknownFile, "utf8");
  fs.writeFileSync(unknownFile, original.replace('["taxonomy-new-label"]', '["kafka"]'));
  await page.goto(`${base}/?section=unclassified`);
  assert.ok(!(await fixtureLinks()).includes("/posts/__taxonomy-test-unknown"));
  await page.goto(`${base}/?section=tech`);
  assert.ok((await fixtureLinks()).includes("/posts/__taxonomy-test-unknown"));

  const login = await context.request.post(`${base}/api/auth/login`, {
    form: { password: process.env.TEST_AUTH_PASSWORD || "local-taxonomy-test", next: "/" }, maxRedirects: 0,
  });
  assert.equal(login.status(), 303);
  await page.goto(`${base}/?section=unclassified`);
  assert.ok((await fixtureLinks()).includes("/posts/__taxonomy-test-private"));
  assert.ok(await page.locator('a[href="/posts/__taxonomy-test-private"]').getByRole("img", { name: "비공개 글" }).isVisible());
  const authedTabs = page.getByRole("navigation", { name: "글 대분류" });
  assert.ok(Number(await authedTabs.locator('a[href="/?section=unclassified"] span').innerText()) > 3);
  await page.screenshot({ path: "/tmp/blog-unclassified-1440.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: taxonomy tabs, unclassified reasons, Markdown/HTML, counts, filters, relabeling, 320px layout and public/private visibility");
} finally {
  await browser?.close();
  for (const file of files) fs.unlinkSync(file);
}
