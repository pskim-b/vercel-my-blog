import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAllMarkdownFiles } from "@/lib/utils";
import { isPublicSlug } from "@/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};

function contentType(filePath: string) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function isSafeRelativePath(value: string) {
  return value && !path.isAbsolute(value) && !value.split(/[\\/]/).includes("..");
}

function isPublicAsset(relativeAssetPath: string) {
  const normalized = relativeAssetPath.replace(/\\/g, "/");
  const resourceIndex = normalized.split("/").lastIndexOf("resource");
  if (resourceIndex <= 0) return false;

  const assetDir = normalized.split("/").slice(0, resourceIndex).join("/");
  if (isPublicSlug(`${assetDir}/asset-probe.md`)) return true;

  const postsDir = path.join(process.cwd(), "posts");
  let markdownFiles: string[] = [];
  try {
    markdownFiles = getAllMarkdownFiles(path.join(postsDir, assetDir));
  } catch {
    return false;
  }

  return markdownFiles.some((filePath) => {
    const fileContent = readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);
    const slug = path.relative(postsDir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
    return isPublicSlug(slug, data.scope);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const relativeAssetPath = (await params).path.map(decodeURIComponent).join("/");

  if (!isSafeRelativePath(relativeAssetPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isPublicAsset(relativeAssetPath) && !(await isAuthenticated())) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const postsDir = path.join(process.cwd(), "posts");
  const filePath = path.join(postsDir, relativeAssetPath);
  const resolved = path.resolve(filePath);
  const root = path.resolve(postsDir);

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(resolved);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType(resolved),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
