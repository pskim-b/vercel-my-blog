import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname), "Run fixture tests against a local server only");
const fixture = new URL("../posts/__html-test-private.html", import.meta.url);
const publicFixture = new URL("../posts/study/html-demo.html", import.meta.url);
const source = fs.readFileSync(new URL("./fixtures/html-demo.html", import.meta.url), "utf8");
assert.ok(!fs.existsSync(fixture), "Temporary fixture must not overwrite an existing post");
assert.ok(!fs.existsSync(publicFixture), "Temporary fixture must not overwrite an existing post");
let browser;
try {
  const privateSource = source.replace("scope: public", "scope: private")
    .replace("</style>", "nav,a,time{display:none!important;color:rgb(255,0,0)!important}</style>")
    .replace("<body>", "<body><psnote-meta></psnote-meta>");
  fs.writeFileSync(fixture, privateSource, { flag: "wx" });
  fs.writeFileSync(publicFixture, source, { flag: "wx" });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const entry = await context.request.get(`${base}/posts/study/html-demo`, { maxRedirects: 0 });
  assert.equal(entry.status(), 307);
  assert.equal(entry.headers().location, "/html-posts/study/html-demo");
  await page.goto(`${base}/posts/study/html-demo`);
  assert.equal(new URL(page.url()).pathname, "/html-posts/study/html-demo");
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(await page.locator("h1").count(), 1);
  const metadata = page.getByRole("navigation", { name: "글 메타정보" });
  assert.ok(await metadata.isVisible());
  assert.equal(await metadata.locator("time").textContent(), "2026-10-26");
  assert.equal(await metadata.getByRole("link", { name: "study", exact: true }).getAttribute("href"), "/?category=study");
  assert.equal(await metadata.getByRole("link", { name: "interactive", exact: true }).getAttribute("href"), "/?label=interactive");
  assert.equal(await metadata.getByText("private", { exact: true }).count(), 0);
  assert.equal(await page.locator('meta[name="description"]').getAttribute("content"), "A self-contained HTML counter with independent styling and sandbox isolation.");
  await page.getByRole("button", { name: "Increase count" }).click();
  assert.equal(await page.locator("output").textContent(), "1");
  await page.getByRole("button", { name: "Decrease count" }).click();
  assert.equal(await page.locator("output").textContent(), "0");
  await page.getByRole("button", { name: "Increase count" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  assert.equal(await page.locator("output").textContent(), "0");
  assert.equal(await page.evaluate(() => { try { localStorage.setItem("test", "1"); return true; } catch { return false; } }), false);
  assert.equal(await page.evaluate(async () => { try { await fetch("/api/auth/logout", { method: "POST" }); return true; } catch { return false; } }), false);
  await page.screenshot({ path: "/tmp/blog-html-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "/tmp/blog-html-mobile.png", fullPage: true });
  const raw = await context.request.get(`${base}/html-posts/study/html-demo`);
  assert.equal(raw.status(), 200);
  assert.match(raw.headers()["content-security-policy"], /sandbox allow-scripts/);
  assert.equal(raw.headers()["cache-control"], "private, no-store");
  const standalone = await context.newPage();
  await standalone.goto(`${base}/html-posts/study/html-demo`);
  await standalone.getByRole("button", { name: "Increase count" }).click();
  assert.equal(await standalone.locator("output").textContent(), "1");
  assert.equal(await standalone.evaluate(() => { try { localStorage.setItem("test", "1"); return true; } catch { return false; } }), false);
  await standalone.close();
  assert.equal((await context.request.get(`${base}/html-posts/__html-test-private`)).status(), 401);
  const privatePage = await context.request.get(`${base}/posts/__html-test-private`, { maxRedirects: 0 });
  assert.equal(privatePage.status(), 307);
  assert.ok(privatePage.headers().location.startsWith("/login?"));
  const home = await (await context.request.get(base)).text();
  assert.ok(!home.includes('/posts/__html-test-private'));
  assert.ok(home.includes("A self-contained HTML counter"));
  assert.equal((await context.request.get(`${base}/post-assets/study/html-demo.html`)).status(), 404);
  assert.equal((await context.request.get(`${base}/post-assets/study/resource/evil.html`)).status(), 404);
  assert.equal((await context.request.get(`${base}/html-posts/missing`)).status(), 404);
  assert.equal((await context.request.get(`${base}/html-posts/book/head_first_design_pattern_20260719`)).status(), 404);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/posts/study/2026-10-20-file-upload-to-cdn-architecture`);
    assert.equal(new URL(page.url()).pathname, "/html-posts/study/2026-10-20-file-upload-to-cdn-architecture");
    assert.equal(await page.locator("iframe").count(), 0);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok(await page.getByRole("navigation", { name: "글 메타정보" }).isVisible());
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      contentWidth: document.querySelector(".page").getBoundingClientRect().width,
    }));
    assert.ok(layout.scroll <= width, `Page overflow at ${width}px`);
    assert.equal(layout.viewport, width);
    assert.equal(layout.bodyBackground, "rgb(255, 255, 255)");
    assert.ok(layout.contentWidth >= Math.min(width - 28, 850));
    await page.screenshot({ path: `/tmp/blog-standalone-${width}.png` });
    console.log(`PASS: actual HTML ${width}px viewport, ${layout.contentWidth}px content, no page overflow`);
  }
  await page.goto(`${base}/posts/book/head_first_design_pattern_20260719`);
  assert.equal(await page.locator("iframe").count(), 0);
  assert.ok(await page.locator("article").textContent());
  const login = await context.request.post(`${base}/api/auth/login`, {
    form: { password: "local-html-test", next: "/posts/__html-test-private" }, maxRedirects: 0,
  });
  assert.equal(login.status(), 303);
  assert.equal((await context.request.get(`${base}/html-posts/__html-test-private`)).status(), 200);
  await page.goto(`${base}/posts/__html-test-private`);
  assert.equal(new URL(page.url()).pathname, "/html-posts/__html-test-private");
  const privateMetadata = page.getByRole("navigation", { name: "글 메타정보" });
  assert.ok(await privateMetadata.isVisible());
  assert.ok(await privateMetadata.getByText("private", { exact: true }).isVisible());
  assert.ok(await privateMetadata.locator("time").isVisible());
  assert.equal(await privateMetadata.getByRole("link", { name: "블로그로 돌아가기" }).evaluate(element => getComputedStyle(element).color), "rgb(23, 107, 85)");
  await page.getByRole("button", { name: "Increase count" }).click();
  assert.equal(await page.locator("output").textContent(), "1");
  await privateMetadata.getByRole("link", { name: "블로그로 돌아가기" }).click();
  await page.waitForURL(`${base}/`);
  await page.goto(`${base}/html-posts/study/html-demo`);
  await page.getByRole("navigation", { name: "글 메타정보" }).getByRole("link", { name: "study", exact: true }).click();
  await page.waitForURL(`${base}/?category=study`);
  console.log("PASS: standalone redirects, no iframe or duplicate heading, desktop/mobile counter, sandbox storage/network, headers, public/private routes, login, listing, asset source blocking, Markdown regression");
} finally {
  await browser?.close();
  fs.unlinkSync(fixture);
  fs.unlinkSync(publicFixture);
}
