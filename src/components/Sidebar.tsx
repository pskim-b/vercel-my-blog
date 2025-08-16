import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Image from "next/image";

function getCategories() {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);
  const categoryCount: Record<string, number> = {};

  filenames
    .filter((filename) => {
      const filePath = path.join(postsDir, filename);
      return fs.statSync(filePath).isFile() && filename.endsWith('.md');
    })
    .forEach((filename) => {
      const filePath = path.join(postsDir, filename);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContent);
      const category = data.category;
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

  return Object.entries(categoryCount).map(([name, count]) => ({ name, count }));
}

function getRecentPosts(limit: number = 5) {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);

  const posts = filenames
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
        slug: filename.replace(/\.md$/, ""),
        category: data.category,
      };
    })
    .filter(post => post.category !== "memo"); // Only show public posts

  return posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export default function Sidebar() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-bold">Kim Pyeong Seok</h2>
        <p className="text-gray-400">The engineer of *</p>
        <p className="text-sm text-gray-500 mt-2">{currentDate}</p>
      </div>
    </div>
  );
}
