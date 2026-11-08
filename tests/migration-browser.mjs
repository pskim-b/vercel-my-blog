import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://127.0.0.1:3105";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const files = [];
const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOfoAAAAASUVORK5CYII=";
const originalUrl = "https://example.tistory.com/entry/old?view=original#code";
let browser;
function fixture(name, date, source, scope = "public", format = "md") {
  const file = new URL(`../posts/__migration-test-${name}.${format}`, import.meta.url);
  const metadata = `---\ntitle: "이관 검증 ${name}"\ndate: "${date}"\ncategory: migration-test\nlabel: [writing, ai-generated]\nscope: ${scope}\ndescription: "옛 글의 코드, 이미지, 표와 그래프"\nmigration:\n  source: ${source}\n  originalUrl: "${originalUrl}"\n  originalPublishedAt: "${date}"\n  importedAt: "2026-10-30T10:00:00+09:00"\n---`;
  const markdown = `\n오래된 글의 원래 본문입니다.\n\n\`\`\`javascript\nconst year = 2001;\n\`\`\`\n\n| 년도 | 값 |\n| --- | --- |\n| 2001 | 10 |\n\n![원본 이미지](${pixel})\n`;
  const html = `<!doctype html><html><head><title>Original</title><style>body{background:#fff;color:#123456}</style></head><body><h1>원래 글</h1><pre><code>if (x &lt; 2) {\n  next();\n}</code></pre><img alt="원본 이미지" src="${pixel}"><table><tr><td>10</td></tr></table><svg role="img" aria-label="원본 그래프" viewBox="0 0 100 30"><path d="M0 20L30 10L60 15L100 0" stroke="blue" fill="none"/></svg></body></html>`;
  fs.writeFileSync(file, format === "html" ? `<!--\n${metadata}\n-->\n${html}` : metadata + markdown, { flag: "wx" });
  files.push(file);
}
try {
  for (let i = 0; i < 6; i++) fixture(`recent-${i}`, `2001-01-0${i + 1}T00:30:00+09:00`, "tistory");
  for (let i = 0; i < 6; i++) fixture(`old-${i}`, `2000-07-0${i + 1}`, "naver");
  fixture("html", "2001-01-01T01:00:00+09:00", "hugo", "public", "html");
  fixture("private", "1998-01-01", "naver", "private");
  browser = await chromium.launch(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {});
  const context = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/?category=migration-test`);
    const index = page.getByRole("navigation", { name: "연도별 글 인덱스" });
    assert.ok(await index.isVisible());
    assert.equal(await index.getByRole("link", { name: /^2001/ }).count(), 1);
    assert.equal(await index.getByRole("link", { name: /^1998/ }).count(), 0);
    assert.equal(await page.locator("[data-post-date]").count(), 13);
    const pointer = page.getByLabel("현재 읽는 글의 날짜");
    await page.waitForFunction(() => document.querySelector('output[aria-label="현재 읽는 글의 날짜"]').textContent === "2001년 01월");
    await page.screenshot({ path: `/tmp/blog-migration-archive-${width}.png` });
    await page.locator("[data-archive-scroll]").evaluate(root => { root.scrollTop = root.scrollHeight; });
    await page.waitForFunction(() => document.querySelector('output[aria-label="현재 읽는 글의 날짜"]').textContent === "2000년 07월");
    assert.equal(await pointer.innerText(), "2000년 07월");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `/tmp/blog-migration-scroll-${width}.png` });
  }
  await page.goto(`${base}/?label=tistory&year=2001`);
  assert.equal(await page.locator("[data-post-date]").count(), 6);
  assert.ok(await page.locator("[data-post-labels]").evaluateAll(labels => labels.every(el => el.textContent.includes("tistory") && !el.textContent.includes("ai-generated"))));
  await page.getByRole("button", { name: "Browse categories and labels" }).click();
  const naver = page.locator('#post-filter-menu a').filter({ hasText: /^naver / });
  assert.ok((await naver.getAttribute("href")).includes("year=2001"));
  await naver.click();
  await page.getByText("2001년에 해당하는 글이 없습니다.").waitFor();
  assert.equal(await page.locator("[data-post-date]").count(), 0);
  await page.getByRole("navigation", { name: "연도별 글 인덱스" }).getByRole("link", { name: /^2000/ }).click();
  await page.locator("[data-post-date]").first().waitFor();
  assert.equal(await page.locator("[data-post-date]").count(), 6);
  assert.ok(new URL(page.url()).searchParams.get("label") === "naver");
  await page.goto(`${base}/posts/__migration-test-recent-0`);
  assert.equal(await page.getByRole("link", { name: "원문 보기 · tistory" }).getAttribute("href"), originalUrl);
  assert.equal(await page.locator("header time").getAttribute("datetime"), "2001-01-01T00:30:00+09:00");
  assert.ok((await page.locator("header time").innerText()).startsWith("2001-01-01"));
  assert.equal(await page.locator("article table").count(), 1);
  assert.ok((await page.locator("article pre code").innerText()).includes("const year = 2001;"));
  await page.waitForFunction(() => document.querySelector("article img")?.naturalWidth > 0);
  await page.goto(`${base}/posts/__migration-test-html`);
  assert.equal(await page.getByRole("link", { name: "원문 보기 · hugo" }).getAttribute("href"), originalUrl);
  assert.equal(await page.locator("table").count(), 1);
  assert.equal(await page.getByRole("img", { name: "원본 그래프" }).count(), 1);
  await page.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
  assert.ok((await page.locator("pre code").innerText()).includes("if (x < 2)"));
  const login = await context.request.post(`${base}/api/auth/login`, { form: { password: "local-html-test", next: "/" }, maxRedirects: 0 });
  assert.equal(login.status(), 303);
  await page.goto(`${base}/?category=migration-test&year=1998`);
  assert.equal(await page.locator("[data-post-date]").count(), 1);
  assert.deepEqual(errors, []);
  console.log("PASS: independent year/topic filters, 2000s scroll date pointer, private-year exclusion, source labels, original links/dates, Markdown/HTML code/images/tables/graphs, mobile layout");
} finally {
  await browser?.close();
  for (const file of files) fs.unlinkSync(file);
}
