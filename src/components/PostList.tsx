import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
}

function getPosts(): PostMeta[] {
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
  });
}

export default function PostList() {
  const posts = getPosts();

  return (
    <ul className="space-y-6">
      {posts.map((post) => (
        <li key={post.slug}>
          <a href={`/posts/${post.slug}`} className="text-xl text-blue-600 hover:underline font-semibold">
            {post.title}
          </a>
          <div className="text-sm text-gray-500 flex gap-2 items-center">
            <span>{new Date(post.date).toLocaleDateString()}</span>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{post.category}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}