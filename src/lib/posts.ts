import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getAllMarkdownFiles } from "./utils";

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
}

export function getAllPosts(): PostMeta[] {
  const postsDir = path.join(process.cwd(), "posts");
  const markdownFiles = getAllMarkdownFiles(postsDir);

  return markdownFiles
    .map((filePath) => {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContent);
      
      // Create slug from relative path to posts directory
      const relativePath = path.relative(postsDir, filePath);
      const slug = relativePath.replace(/\.md$/, "").replace(/\\/g, "/"); // Handle Windows paths
      
      return {
        title: data.title,
        date: data.date,
        category: data.category,
        slug,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get post by slug (supports subdirectories)
export function getPostBySlug(slug: string) {
  const postsDir = path.join(process.cwd(), "posts");
  
  // Decode URL-encoded slug
  const decodedSlug = decodeURIComponent(slug);
  
  // Use getAllMarkdownFiles to find the exact file path
  const markdownFiles = getAllMarkdownFiles(postsDir);
  
  // Find the file that matches the slug exactly
  const targetFile = markdownFiles.find((filePath) => {
    const relativePath = path.relative(postsDir, filePath);
    const fileSlug = relativePath.replace(/\.md$/, "").replace(/\\/g, "/");
    return fileSlug === decodedSlug;
  });
  
  if (!targetFile) {
    console.log(`File not found for slug: ${decodedSlug}`); // Debug log
    console.log(`Available files:`, markdownFiles.map(fp => {
      const relativePath = path.relative(postsDir, fp);
      return relativePath.replace(/\.md$/, "").replace(/\\/g, "/");
    }));
    return null;
  }

  try {
    const fileContent = fs.readFileSync(targetFile, "utf8");
    const { data, content } = matter(fileContent);
    
    return {
      meta: {
        title: data.title,
        date: data.date,
        category: data.category,
        slug: decodedSlug,
      },
      content,
    };
  } catch (error) {
    console.error(`Error reading file for slug ${decodedSlug}:`, error);
    return null;
  }
}