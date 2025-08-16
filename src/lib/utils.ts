import fs from "fs";
import path from "path";

// Helper function to recursively get all markdown files
export function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively get files from subdirectories
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (stat.isFile() && item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
} 