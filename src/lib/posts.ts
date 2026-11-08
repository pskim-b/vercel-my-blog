import fs from "fs";
import path from "path";
import { parseContent } from "./content.mjs";
import { indexPostSources } from "./post-files.mjs";
import { cache } from "react";
import { normalizeLabels } from "./labels.mjs";
import { canAccessPost } from "./taxonomy.mjs";

export interface PostMeta {
  title: string;
  date: string;
  activityDate?: string;
  category: string;
  label: string[];
  slug: string;
  scope: "public" | "private";
  isPublic: boolean;
  format: "md" | "html";
  description: string;
  migration?: {
    source: "naver" | "tistory" | "hugo";
    originalUrl: string;
    originalPath: string;
    originalPublishedAt: string;
    importedAt: string;
    originalId?: string;
    sourcePath?: string;
    taxonomy?: { section: string; type: string | null; topicPaths: string[] };
  };
}

const getPostSources = cache(() => indexPostSources({
  publicRoot: path.join(process.cwd(), "posts"),
  privateRoot: process.env.BLOG_PRIVATE_POSTS_DIR,
}));

function normalizeScope(scope: unknown): "public" | "private" {
  return scope === "public" ? "public" : "private";
}

function readAllowedFolders(): string[] {
  const allowPath = path.join(process.cwd(), "posts", "allow.yml");

  if (!fs.existsSync(allowPath)) return [];

  const content = fs.readFileSync(allowPath, "utf8");
  const folders: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*["']?([^"'\s#]+)["']?/);
    if (match) folders.push(match[1].replace(/^\/+|\/+$/g, ""));
  }

  return folders.filter(Boolean);
}

export function isPublicSlug(slug: string, scope?: unknown, metadata?: Record<string, unknown>): boolean {
  const normalizedSlug = slug.replace(/\\/g, "/");
  const topLevelFolder = normalizedSlug.split("/")[0];
  const source = getPostSources().get(normalizedSlug);
  if (!source || source.privateSource) return false;

  if (!metadata) {
    const file = source.file;
    metadata = parseContent(fs.readFileSync(file, "utf8"), file.endsWith(".html") ? "html" : "md").data;
  }
  const publicSource = normalizeScope(scope ?? metadata?.scope) === "public" || readAllowedFolders().includes(topLevelFolder);
  return publicSource && canAccessPost({ ...metadata, isPublic: true }, false);
}

export function getAllPosts(): PostMeta[] {
  const markdownFiles = Array.from(getPostSources());

  return markdownFiles
    .map(([slug, { file: filePath, privateSource }]) => {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const format: "html" | "md" = filePath.endsWith(".html") ? "html" : "md";
      const { data } = parseContent(fileContent, format);
      
      return {
        title: data.title,
        date: data.date,
        activityDate: typeof data.activityDate === "string" ? data.activityDate : undefined,
        category: data.category,
        label: normalizeLabels(data.label),
        slug,
        scope: privateSource ? "private" as const : normalizeScope(data.scope),
        isPublic: isPublicSlug(slug, data.scope, data),
        format,
        description: typeof data.description === "string" ? data.description : "",
        migration: data.migration,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get post by slug (supports subdirectories)
export function getPostBySlug(slug: string) {
  
  // Next.js route params have already been decoded.
  const decodedSlug = slug;
  
  const source = getPostSources().get(decodedSlug);
  const targetFile = source?.file;
  
  if (!targetFile) {
    return null;
  }

  try {
    const fileContent = fs.readFileSync(targetFile, "utf8");
    const format: "html" | "md" = targetFile.endsWith(".html") ? "html" : "md";
    const { data, content } = parseContent(fileContent, format);
    
    return {
      meta: {
        title: data.title,
        date: data.date,
        activityDate: typeof data.activityDate === "string" ? data.activityDate : undefined,
        category: data.category,
        label: normalizeLabels(data.label),
        slug: decodedSlug,
        scope: source?.privateSource ? "private" as const : normalizeScope(data.scope),
        isPublic: isPublicSlug(decodedSlug, data.scope, data),
        format,
        description: typeof data.description === "string" ? data.description : "",
        migration: data.migration,
      },
      content,
    };
  } catch (error) {
    console.error(`Error reading file for slug ${decodedSlug}:`, error);
    return null;
  }
}

export function getPrivateHtmlFile(slug: string): string | null {
  const source = getPostSources().get(slug);
  return source?.privateSource && source.file.endsWith(".html") ? source.file : null;
}
