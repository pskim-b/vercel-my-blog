import fs from "node:fs/promises";
import path from "node:path";

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

  let copied = 0;

  // Find every ".../resource" directory under posts/
  for await (const dir of walkDirs(postsDir)) {
    if (path.basename(dir) !== "resource") continue;

    const relFromPosts = path.relative(postsDir, dir).replaceAll("\\", "/");
    const dest = path.join(publicDir, "posts", relFromPosts);

    await copyDir(dir, dest);
    copied++;
  }

  console.log(`[sync-post-assets] synced ${copied} resource director${copied === 1 ? "y" : "ies"}`);
}

await main();


