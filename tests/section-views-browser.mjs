import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
const base = process.env.TEST_URL || "http://127.0.0.1:3128";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const privateTitle = "Parallel Consumer 리밸런싱 장애와 대체 아키텍처";
  await page.goto(`${base}/?section=tech&topic=kafka`);
  assert.equal(
    await page.getByRole("link", { name: privateTitle, exact: true }).count(),
    0,
  );
  assert.equal(await page.getByRole("navigation", { name: "기술 토픽 탐색" }).getByRole("link", { name: /^kafka\s/ }).count(), 0);
  assert.match(await page.locator(".editor-path").innerText(), /모든 토픽/);
  await page.goto(`${base}/?section=parenting`);
  assert.equal(await page.locator(".parenting-record").count(), 0);

  const login = await context.request.post(`${base}/api/auth/login`, {
    form: {
      password: process.env.TEST_AUTH_PASSWORD || "local-section-test",
      next: "/",
    },
    maxRedirects: 0,
  });
  assert.equal(login.status(), 303);
  let layoutChecks = 0;
  const backgroundColors = new Set();
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of [
        "tech",
        "reflections",
        "writing",
        "exercise",
        "journal",
        "parenting",
        "unclassified",
      ]) {
        await page.goto(`${base}/?section=${section}`);
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        assert.equal(
          await page.locator(".blog-shell").getAttribute("data-section-theme"),
          section,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${theme}/${width}/${section}: overflow`,
        );
        if (width === 1440 && section !== "unclassified") {
          backgroundColors.add(
            await page
              .locator(".blog-shell")
              .evaluate((el) => getComputedStyle(el).backgroundColor),
          );
          await page.screenshot({
            path: `/tmp/blog-real-${theme}-${section}.png`,
            fullPage: true,
          });
        }
        if (section === "writing") {
          assert.ok((await page.locator(".manuscript").count()) > 0);
          const columns = await page
            .locator(".manuscript-cells")
            .first()
            .evaluate(
              (el) =>
                getComputedStyle(el).gridTemplateColumns.split(" ").length,
            );
          assert.equal(columns, width > 760 ? 20 : 10);
        }
        layoutChecks++;
      }
    }
  }
  // Writing stays white in both appearances; the other five themes adapt.
  assert.equal(backgroundColors.size, 11);
  await page.goto(`${base}/?section=tech&topic=kafka/consumer`);
  assert.ok(
    await page
      .getByRole("link", { name: privateTitle, exact: true })
      .isVisible(),
  );
  assert.equal(await page.locator('[data-topic-depth="4"]').count(), 0);
  assert.match(
    await page.locator(".editor-path").innerText(),
    /kafka \/ consumer/,
  );
  await page.goto(`${base}/?section=tech&topic=engineering-management`);
  assert.equal(await page.locator(".knowledge-file").count(), 4);
  await page.goto(`${base}/?section=reflections&type=restaurant`);
  assert.equal(await page.locator(".reflections-record").count(), 1);
  assert.match(
    await page.locator(".reflections-record").innerText(),
    /콜드브루/,
  );
  await page.goto(`${base}/?section=writing&type=poetry`);
  assert.equal(await page.locator(".manuscript").count(), 2);
  await page.goto(`${base}/?section=exercise&month=2026-09`);
  assert.ok((await page.locator(".exercise-record").count()) > 1);
  const run = page
    .locator(".exercise-record")
    .filter({ hasText: "2026-09-29 화요일 러닝 기록" });
  assert.equal(
    await run.locator(".record-day").getAttribute("datetime"),
    "2026-09-29",
  );
  assert.match(await run.innerText(), /6\.42/);
  await page.goto(`${base}/?section=journal&month=2026-07`);
  assert.ok(
    (await page
      .getByRole("link", {
        name: "[Life] 2026년 출산 휴가 - 12일차",
        exact: true,
      })
      .count()) > 0,
  );
  const dates = await page
    .locator(".journal-record")
    .evaluateAll((records) => records.map((record) => record.dataset.postDate));
  assert.ok(dates.every((date) => date.startsWith("2026-07")));
  await page.goto(`${base}/?section=parenting`);
  assert.equal(await page.locator(".parenting-record").count(), 3);
  await page.goto(`${base}/posts/poem/2026-09-23-dream-sleep`);
  assert.equal(
    await page.locator(".themed-post").getAttribute("data-section-theme"),
    "writing",
  );
  await page.getByRole("link", { name: "← 글쓰기 목록" }).click();
  await page.waitForURL((url) => url.searchParams.get("section") === "writing");
  assert.equal(new URL(page.url()).searchParams.get("section"), "writing");
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${layoutChecks} theme/layout checks, topic/type/month filters, 3-level topics, real metrics/activity dates, private visibility, parenting and themed post navigation`,
  );
} finally {
  await browser.close();
}
