import fs from "node:fs";
import path from "node:path";
import { indexContent, parseContent } from "../src/lib/content.mjs";

const index = indexContent(path.join(process.cwd(), "posts"));
for (const [slug, file] of index) {
  try { parseContent(fs.readFileSync(file, "utf8"), file.endsWith(".html") ? "html" : "md"); }
  catch (error) { throw new Error(`Invalid post ${slug}: ${error.message}`); }
}
console.log(`[validate-posts] validated ${index.size} posts`);
