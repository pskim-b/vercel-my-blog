import fs from "node:fs";
import path from "node:path";
import { indexContent, parseContent } from "../src/lib/content.mjs";
import { classifyPost } from "../src/lib/taxonomy.mjs";

const index = indexContent(path.join(process.cwd(), "posts"));
let unclassified = 0;
let unknownLabels = 0;
for (const [slug, file] of index) {
  try {
    const { data } = parseContent(fs.readFileSync(file, "utf8"), file.endsWith(".html") ? "html" : "md");
    const classification = classifyPost(data);
    if (classification.section === "unclassified") unclassified++;
    unknownLabels += classification.unknownLabels.length;
  }
  catch (error) { throw new Error(`Invalid post ${slug}: ${error.message}`); }
}
console.log(`[validate-posts] validated ${index.size} posts`);
console.log(`[taxonomy] ${unclassified} unclassified posts; ${unknownLabels} unregistered label usages (non-blocking)`);
