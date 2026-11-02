import fs from "node:fs";
import path from "node:path";
import { indexContent, parseContent } from "../src/lib/content.mjs";
import { classifyPost, taxonomySections } from "../src/lib/taxonomy.mjs";

const posts = [...indexContent(path.join(process.cwd(), "posts"))].map(([slug, file]) => {
  const { data } = parseContent(fs.readFileSync(file, "utf8"), file.endsWith(".html") ? "html" : "md");
  return { slug, ...classifyPost(data) };
});
const counts = Object.fromEntries(taxonomySections.map(section => [section.id, posts.filter(post => post.section === section.id).length]));
const review = posts.filter(post => post.issues.length || post.unknownLabels.length);
if (process.argv.includes("--json")) console.log(JSON.stringify({ total: posts.length, counts, review }, null, 2));
else {
  console.log(`전체 ${posts.length}개 글`);
  for (const section of taxonomySections) console.log(`${section.title}: ${counts[section.id]}`);
  console.log(`검토할 글: ${review.length} (미등록 보조 라벨 포함)`);
  console.log("글별 사유: npm run taxonomy:audit -- --json");
}
