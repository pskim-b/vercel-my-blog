import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
}

export function getAllPosts(): PostMeta[] {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);

  return filenames.map((filename) => {
    const filePath = path.join(postsDir, filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);
    return {
      title: data.title,
      date: data.date,
      category: data.category,
      slug: filename.replace(/\.md$/, ""),
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}