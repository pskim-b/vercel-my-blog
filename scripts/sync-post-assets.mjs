import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function* walkDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield full;
      yield* walkDirs(full);
    }
  }
}

async function getAllMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }

  return files;
}

async function readAllowedFolders(postsDir) {
  const allowPath = path.join(postsDir, "allow.yml");

  if (!(await pathExists(allowPath))) return [];

  const content = await fs.readFile(allowPath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*["']?([^"'\s#]+)["']?/)?.[1])
    .filter(Boolean)
    .map((folder) => folder.replace(/^\/+|\/+$/g, ""));
}

function isAllowedFolder(relativePath, allowedFolders) {
  return allowedFolders.includes(relativePath.replaceAll("\\", "/").split("/")[0]);
}

async function hasPublicPost(dir, postsDir, allowedFolders) {
  const relativeDir = path.relative(postsDir, dir).replaceAll("\\", "/");
  if (isAllowedFolder(relativeDir, allowedFolders)) return true;

  const markdownFiles = await getAllMarkdownFiles(dir);
  for (const filePath of markdownFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const { data } = matter(content);
    if (data.scope === "public") return true;
  }

  return false;
}

async function copyDir(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  // Node 20+: fs.cp supports recursive copy
  await fs.cp(srcDir, destDir, { recursive: true, force: true });
}

async function main() {
  const projectRoot = process.cwd();
  const postsDir = path.join(projectRoot, "posts");
  const publicDir = path.join(projectRoot, "public");

  if (!(await pathExists(postsDir))) {
    console.warn(`[sync-post-assets] posts dir not found: ${postsDir}`);
    return;
  }
  await fs.mkdir(publicDir, { recursive: true });
  await fs.rm(path.join(publicDir, "posts"), { recursive: true, force: true });

  let copied = 0;
  const allowedFolders = await readAllowedFolders(postsDir);

  // Find every ".../resource" directory under posts/
  for await (const dir of walkDirs(postsDir)) {
    if (path.basename(dir) !== "resource") continue;

    const relFromPosts = path.relative(postsDir, dir).replaceAll("\\", "/");
    const postDir = path.dirname(dir);

    if (!(await hasPublicPost(postDir, postsDir, allowedFolders))) continue;

    const dest = path.join(publicDir, "posts", relFromPosts);

    await copyDir(dir, dest);
    copied++;
  }

  console.log(`[sync-post-assets] synced ${copied} resource director${copied === 1 ? "y" : "ies"}`);
}

await main();
