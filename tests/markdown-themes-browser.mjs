import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://127.0.0.1:3128";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
const code = 'const answer = "<safe>"; // readable comment\n\tconsole.log(answer);\n';
const sections = { tech: ["agent-context"], reflections: ["book"], writing: ["project:writing-and-thought"], exercise: ["running"], journal: ["journal"], parenting: ["parenting"], unclassified: ["ai-generated"] };
const files = [];
let browser;
try {
  for (const [section, labels] of Object.entries(sections)) {
    const file = path.resolve(`posts/__markdown-theme-${section}.md`);
    fs.writeFileSync(file, `---\ntitle: "Markdown ${section}"\ndate: "2026-11-03"\ncategory: "note"\nscope: "public"\nlabel: ${JSON.stringify(labels)}\n---\n# Heading\n\nReadable **bold** and *emphasis*, \`inline()\`, [a link](https://example.com).\n\n> Quoted **words** and \`quotedCode()\`.\n\n- List **content**\n\n| Key | Value |\n| --- | --- |\n| name | readable |\n\n\`\`\`javascript\n${code}\`\`\`\n`, { flag: "wx" });
    if (section === "writing") fs.appendFileSync(file, '\n- Code in a list:\n\n  ```javascript\n  const nested = "preserved";\n  ```\n');
    files.push(file);
  }
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  assert.equal((await context.request.post(`${base}/api/auth/login`, { form: { password: process.env.TEST_AUTH_PASSWORD || "local-section-test", next: "/" }, maxRedirects: 0 })).status(), 303);
  let checks = 0;
  for (const theme of ["light", "dark"]) for (const width of [320, 1280]) for (const section of Object.keys(sections)) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/posts/__markdown-theme-${section}`);
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    assert.equal(await page.locator(".themed-post").getAttribute("data-section-theme"), section);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section}/${theme}/${width}: overflow`);
    // markdown-to-jsx normalizes tabs to four spaces before the code renderer.
    assert.equal(await page.locator(".code-block pre code").first().textContent(), code.replaceAll("\t", "    "));
    const contrasts = await page.locator(".themed-post").evaluate(root => {
      const rgb = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(x => value.startsWith("color(srgb") ? x * 255 : x);
      const luminance = channels => channels.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
      return [...root.querySelectorAll("p,strong,em,a,li,th,td,.inline-code,.shiki span[style],.post-title,.post-metadata time,.post-meta-chip,.post-private-badge")].filter(el => el.textContent.trim()).map(el => {
        const fg = luminance(rgb(getComputedStyle(el).color));
        let parent = el, background = "rgba(0, 0, 0, 0)";
        while (parent && background === "rgba(0, 0, 0, 0)") { background = getComputedStyle(parent).backgroundColor; parent = parent.parentElement; }
        const bg = luminance(rgb(background));
        return { text: el.textContent.slice(0, 25), ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
      });
    });
    assert.deepEqual(contrasts.filter(item => item.ratio < 4.49), [], `${section}/${theme}: low contrast`);
    if (section === "writing") {
      assert.ok(await page.locator(".manuscript-body .manuscript-char").count() > 50);
      assert.equal(await page.locator(".manuscript-char .manuscript-char").count(), 0);
      const border = await page.locator(".manuscript-char").first().evaluate(el => getComputedStyle(el).borderColor);
      assert.equal(border, "rgb(207, 118, 111)");
      assert.equal(await page.locator(".inline-code").first().textContent(), "inline()");
      assert.equal(await page.locator(".code-block pre code").last().textContent(), 'const nested = "preserved";\n');
    }
    checks++;
    if (width === 1280) await page.screenshot({ path: `/tmp/markdown-${section}-${theme}.png`, fullPage: true });
  }
  await page.goto(`${base}/?section=tech`);
  const tree = page.getByRole("navigation", { name: "기술 토픽 탐색" });
  assert.equal(await tree.getByRole("link", { name: /^cassandra/ }).count(), 0);
  assert.equal(await tree.getByRole("link", { name: /^ai\s/ }).count(), 1);
  const ai = tree.getByRole("link", { name: /^ai\s/ });
  const aiCount = Number(await ai.locator("small").innerText());
  assert.ok(aiCount > 0);
  await ai.click();
  await page.waitForURL(url => url.searchParams.get("topic") === "ai");
  assert.equal(await page.locator(".knowledge-file").count(), aiCount);
  assert.equal(await tree.getByRole("link", { name: /^ai\s/ }).count(), 1);
  assert.equal(await tree.locator("small").filter({ hasText: /^0$/ }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(`PASS: ${checks} Markdown theme/contrast/layout checks, source code preservation, red manuscript cells and nonempty unique counted packages`);
} finally {
  await browser?.close();
  for (const file of files) fs.unlinkSync(file);
}
