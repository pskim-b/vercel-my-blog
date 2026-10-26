import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export function getContentFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "resource") files.push(...getContentFiles(full));
    else if (entry.isFile() && /\.(md|html)$/.test(entry.name)) files.push(full);
  }
  return files;
}

export function contentSlug(root, file) {
  return path.relative(root, file).replace(/\.(md|html)$/, "").replaceAll("\\", "/");
}

export function parseContent(source, format) {
  if (format === "html") {
    const match = source.match(/^\uFEFF?\s*<!--\s*\r?\n(---\r?\n[\s\S]*?\r?\n---)\s*-->/);
    if (!match) throw new Error("HTML posts require a leading frontmatter comment");
    const { data } = matter(match[1]);
    for (const key of ["title", "date", "category", "description"]) {
      if (typeof data[key] !== "string" || !data[key].trim()) throw new Error(`Invalid HTML metadata: ${key}`);
    }
    if (!Number.isFinite(Date.parse(data.date))) throw new Error("Invalid HTML date");
    if (data.scope !== undefined && !["public", "private"].includes(data.scope)) throw new Error("Invalid HTML scope");
    return { data, content: source.slice(match[0].length).trimStart() };
  }
  return matter(source);
}

export function indexContent(root) {
  const index = new Map();
  for (const file of getContentFiles(root)) {
    const slug = contentSlug(root, file);
    if (index.has(slug)) throw new Error(`Duplicate post slug: ${slug}`);
    index.set(slug, file);
  }
  return index;
}
