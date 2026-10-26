import fs from "fs";
import path from "path";
import { contentSlug, parseContent, indexContent } from "./content.mjs";

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  label: string[];
  slug: string;
  scope: "public" | "private";
  isPublic: boolean;
  format: "md" | "html";
  description: string;
}

function normalizeLabel(label: unknown): string[] {
  if (Array.isArray(label)) {
    return label.filter((item): item is string => typeof item === "string");
  }

  if (typeof label === "string" && label.trim()) {
    return [label];
  }

  return [];
}

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

export function isPublicSlug(slug: string, scope?: unknown): boolean {
  const normalizedSlug = slug.replace(/\\/g, "/");
  const topLevelFolder = normalizedSlug.split("/")[0];

  if (normalizeScope(scope) === "public") return true;
  return readAllowedFolders().includes(topLevelFolder);
}

export function getAllPosts(): PostMeta[] {
  const postsDir = path.join(process.cwd(), "posts");
  const markdownFiles = Array.from(indexContent(postsDir).values());

  return markdownFiles
    .map((filePath) => {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const format: "html" | "md" = filePath.endsWith(".html") ? "html" : "md";
      const { data } = parseContent(fileContent, format);
      
      // Create slug from relative path to posts directory
      const slug = contentSlug(postsDir, filePath);
      
      return {
        title: data.title,
        date: data.date,
        category: data.category,
        label: normalizeLabel(data.label),
        slug,
        scope: normalizeScope(data.scope),
        isPublic: isPublicSlug(slug, data.scope),
        format,
        description: typeof data.description === "string" ? data.description : "",
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get post by slug (supports subdirectories)
export function getPostBySlug(slug: string) {
  const postsDir = path.join(process.cwd(), "posts");
  
  // Next.js route params have already been decoded.
  const decodedSlug = slug;
  
  const targetFile = indexContent(postsDir).get(decodedSlug);
  
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
        category: data.category,
        label: normalizeLabel(data.label),
        slug: decodedSlug,
        scope: normalizeScope(data.scope),
        isPublic: isPublicSlug(decodedSlug, data.scope),
        format,
        description: typeof data.description === "string" ? data.description : "",
      },
      content,
    };
  } catch (error) {
    console.error(`Error reading file for slug ${decodedSlug}:`, error);
    return null;
  }
}
