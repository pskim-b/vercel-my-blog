// src/app/posts/[slug]/page.tsx
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/styles/markdown.css";

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);

  return filenames.map((filename) => ({
    slug: filename.replace(/\.md$/, ""),
  }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = path.join(process.cwd(), "posts", `${slug}.md`);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(fileContent);

  return (
    <article className="prose lg:prose-lg mx-auto p-6">
      <h1>{data.title}</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}