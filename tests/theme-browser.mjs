import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://localhost:3103";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-28T05:59:00+09:00") });
  await page.goto(base);
  const theme = () => page.locator("html").getAttribute("data-theme");
  const selectTheme = async value => {
    const toggle = page.getByRole("switch", { name: "다크 테마" });
    if ((await toggle.getAttribute("aria-checked")) !== String(value === "dark")) await toggle.click();
  };
  assert.equal(await theme(), "dark");
  await page.clock.fastForward(61000);
  assert.equal(await theme(), "light");
  assert.equal(await page.getByRole("switch", { name: "다크 테마" }).getAttribute("aria-checked"), "false");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator("body").evaluate(body => getComputedStyle(body).backgroundColor), "rgb(255, 255, 255)");
    await page.screenshot({ path: `/tmp/blog-theme-light-${width}.png`, fullPage: true });
  }
  await selectTheme("dark");
  assert.equal(await theme(), "dark");
  await page.reload();
  assert.equal(await theme(), "dark");
  await page.goto(`${base}/posts/book/head_first_design_pattern_20260719`);
  assert.equal(await theme(), "dark");
  await page.goto(base);
  assert.equal(await page.getByRole("switch", { name: "다크 테마" }).getAttribute("aria-checked"), "true");
  await page.clock.fastForward(12 * 60 * 60 * 1000);
  assert.equal(await theme(), "dark");
  assert.equal(await page.evaluate(() => localStorage.getItem("blog-theme-preference")), null);
  await selectTheme("light");
  assert.equal(await theme(), "light");
  await page.clock.fastForward(12 * 60 * 60 * 1000);
  assert.equal(await theme(), "light");
  assert.equal(await page.evaluate(() => localStorage.getItem("blog-theme-preference")), null);
  await page.clock.fastForward(12 * 60 * 60 * 1000);
  assert.equal(await theme(), "dark");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `/tmp/blog-theme-dark-${width}.png`, fullPage: true });
  }
  await selectTheme("light");
  await page.goto(`${base}/posts/book/head_first_design_pattern_20260719`);
  assert.equal(await page.locator("h1").first().evaluate(element => getComputedStyle(element).color), "rgb(32, 36, 43)");
  await page.goto(`${base}/posts/study/2026-10-20-file-upload-to-cdn-architecture`);
  assert.equal(await page.locator("html").getAttribute("data-theme"), null);
  assert.equal(await page.getByRole("switch").count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } }); });
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(base);
  const blockedToggle = blockedPage.getByRole("switch", { name: "다크 테마" });
  if (await blockedToggle.getAttribute("aria-checked") === "true") await blockedToggle.click();
  assert.equal(await blockedPage.locator("html").getAttribute("data-theme"), "light");
  await blockedToggle.click();
  assert.equal(await blockedPage.locator("html").getAttribute("data-theme"), "dark");
  console.log("PASS: KST automatic boundaries, single toggle, navigation/reload persistence, override expiry, mobile light/dark layout, Markdown, independent HTML, blocked storage");
} finally { await browser.close(); }
