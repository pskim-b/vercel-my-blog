import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
  isPrivate?: boolean;
}

export function getAllPosts(): PostMeta[] {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);

  return filenames
    .filter((filename) => {
      const filePath = path.join(postsDir, filename);
      return fs.statSync(filePath).isFile() && filename.endsWith('.md');
    })
    .map((filename) => {
      const filePath = path.join(postsDir, filename);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContent);
      return {
        title: data.title,
        date: data.date,
        category: data.category,
        slug: filename.replace(/\.md$/, ""),
        isPrivate: data.category === "memo",
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get only public posts (non-memo)
export function getPublicPosts(): PostMeta[] {
  return getAllPosts().filter(post => post.category !== "memo");
}

// Get only private memos
export function getPrivateMemos(): PostMeta[] {
  return getAllPosts().filter(post => post.category === "memo");
}

// Get post by slug
export function getPostBySlug(slug: string) {
  const postsDir = path.join(process.cwd(), "posts");
  const filePath = path.join(postsDir, `${slug}.md`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);
  
  return {
    meta: {
      title: data.title,
      date: data.date,
      category: data.category,
      slug,
      isPrivate: data.category === "memo",
    },
    content,
  };
}