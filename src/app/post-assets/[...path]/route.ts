import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getContentFiles, parseContent } from "@/lib/content.mjs";
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

  const postsDir = path.join(process.cwd(), "posts");
  let markdownFiles: string[] = [];
  try {
    markdownFiles = getContentFiles(path.join(postsDir, assetDir));
  } catch {
    return false;
  }

  return markdownFiles.some((filePath) => {
    const fileContent = readFileSync(filePath, "utf8");
    const { data, content } = parseContent(fileContent, filePath.endsWith(".html") ? "html" : "md");
    const slug = path.relative(postsDir, filePath).replace(/\.(md|html)$/, "").replace(/\\/g, "/");
    const reference = path.posix.relative(path.posix.dirname(slug), normalized);
    return isPublicSlug(slug, data.scope, data) &&
      [reference, encodeURI(reference)].some(value => content.includes(value));
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const relativeAssetPath = (await params).path.join("/");

  if (!isSafeRelativePath(relativeAssetPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Never expose post sources or executable documents through the asset endpoint.
  if (!relativeAssetPath.split("/").includes("resource") ||
      !CONTENT_TYPES[path.extname(relativeAssetPath).toLowerCase()]) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isPublicAsset(relativeAssetPath) && !(await isAuthenticated())) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const postsDir = path.join(process.cwd(), "posts");
  const filePath = path.join(postsDir, relativeAssetPath);
  let resolved: string;
  let root: string;
  try {
    resolved = await fs.realpath(filePath);
    root = await fs.realpath(postsDir);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!resolved.startsWith(`${root}${path.sep}`) || resolved !== path.join(root, relativeAssetPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(resolved);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType(resolved),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
