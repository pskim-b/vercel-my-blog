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
      };
    });

  return posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export default function Sidebar() {
  const categories = getCategories();
  const recentPosts = getRecentPosts();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Image
          src="/images/profile.jpg"
          alt="Profile"
          width={128}
          height={128}
          className="rounded-full mx-auto"
        />
        <h2 className="mt-4 text-xl font-bold">Kim Pyeong Seok</h2>
        <p className="text-red-500">The engineer of *</p>
      </div>

      <div>
        <h3 className="font-bold border-b pb-1 mb-2">CATEGORY</h3>
        <ul className="space-y-1 text-sm">
          {categories.map((cat) => (
            <li key={cat.name} className="flex justify-between">
              <span>{cat.name}</span>
              <span>{cat.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-bold border-b pb-1 mb-2">RECENT POSTS</h3>
        <ul className="space-y-1 text-sm text-blue-600">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <a href={`/posts/${post.slug}`} className="hover:underline">
                {post.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
