import fs from "node:fs";
import path from "node:path";
import { indexContent } from "./content.mjs";

// Private content lives outside the public source repository and is always authenticated.
export function indexPostSources({ publicRoot, privateRoot }) {
  const sources = new Map([...indexContent(publicRoot)].map(([slug, file]) => [slug, { file, privateSource: false }]));
  if (!privateRoot) return sources;
  if (!path.isAbsolute(privateRoot)) throw new Error("BLOG_PRIVATE_POSTS_DIR must be an absolute path");
  const privatePath = fs.realpathSync(privateRoot);
  const publicPath = fs.realpathSync(publicRoot);
  const repositoryPath = path.dirname(publicPath);
  if (privatePath === repositoryPath || privatePath.startsWith(repositoryPath + path.sep)) {
    throw new Error("Private posts must be outside the public source repository");
  }
  for (const [slug, file] of indexContent(privatePath)) {
    if (sources.has(slug)) throw new Error(`Duplicate public/private post slug: ${slug}`);
    sources.set(slug, { file, privateSource: true });
  }
  return sources;
}
