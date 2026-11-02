import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://127.0.0.1:3128";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const dir = path.resolve("posts/book/__section-access-test");
assert.ok(!fs.existsSync(dir));
let browser;
try {
  fs.mkdirSync(path.join(dir, "resource"), { recursive: true });
  const front = (title, labels) => `---\ntitle: "${title}"\ndate: "2026-11-03"\ncategory: "note"\nscope: "public"\nlabel: ${JSON.stringify(labels)}\ndescription: "Access test"\n---`;
  fs.writeFileSync(path.join(dir, "journal.md"), `${front("Restricted diary marker", ["journal"])}\nRestricted diary body\n![private](./resource/private.png)\n`);
  fs.writeFileSync(path.join(dir, "journal-html.html"), `<!--\n${front("Restricted HTML diary marker", ["journal"])}\n-->\n<!doctype html><html><body>Restricted HTML body<img src="resource/private.png"></body></html>`);
  fs.writeFileSync(path.join(dir, "public.md"), `${front("Public control marker", ["book"])}\n![public](./resource/public.png)\n`);
  for (const name of ["private.png", "public.png"]) fs.writeFileSync(path.join(dir, "resource", name), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Ll8AAAAASUVORK5CYII=", "base64"));
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const query of ["", "?label=journal", "?category=note", "?year=2026"]) {
    await page.goto(`${base}/${query}`);
    assert.equal(await page.locator('nav[aria-label="글 대분류"] a[href="/?section=journal"]').count(), 0);
    assert.equal(await page.getByText("Restricted diary marker", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Restricted HTML diary marker", { exact: true }).count(), 0);
    const tabs = page.locator('nav[aria-label="글 대분류"]');
    const total = Number(await tabs.locator('a[href="/"] span').innerText());
    const counts = await tabs.locator('a:not([href="/"]) span').allTextContents();
    assert.equal(counts.reduce((sum, value) => sum + Number(value), 0), total);
  }
  await page.goto(`${base}/?section=journal&year=2026`);
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(new URL(page.url()).searchParams.get("next"), "/?section=journal&year=2026");
  await page.goto(`${base}/posts/book/__section-access-test/journal`);
  assert.equal(new URL(page.url()).pathname, "/login");
  const html = "/html-posts/book/__section-access-test/journal-html";
  const asset = "/post-assets/book/__section-access-test/resource/private.png";
  assert.equal((await context.request.get(base + html)).status(), 401);
  assert.equal((await context.request.get(base + asset, { maxRedirects: 0 })).status(), 307);
  assert.equal((await context.request.get(base + "/post-assets/book/__section-access-test/resource/public.png")).status(), 200);
  const login = await context.request.post(`${base}/api/auth/login`, { form: { password: process.env.TEST_AUTH_PASSWORD || "local-section-test", next: "/" }, maxRedirects: 0 });
  assert.equal(login.status(), 303);
  await page.goto(`${base}/?section=journal`);
  assert.ok(await page.getByRole("link", { name: "Restricted diary marker", exact: true }).isVisible());
  assert.ok(await page.locator('nav[aria-label="글 대분류"] a[href="/?section=journal"]').isVisible());
  assert.equal((await context.request.get(base + html)).status(), 200);
  assert.equal((await context.request.get(base + asset)).status(), 200);
  await context.request.post(`${base}/api/auth/logout`, { maxRedirects: 0 });
  assert.equal((await context.request.get(base + html)).status(), 401);
  console.log("PASS: taxonomy section policy protects tabs, counts, all/filter lists, direct Markdown/HTML and private assets in public folders; login/logout and public assets work");
} finally {
  await browser?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
