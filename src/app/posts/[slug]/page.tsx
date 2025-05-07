// src/app/posts/[slug]/page.tsx
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import Markdown from "markdown-to-jsx";

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(postsDir);

  return filenames.map((filename) => ({
    slug: filename.replace(/\.md$/, ""),
  }));
}

function getPostContent(slug: string) {
  const filePath = path.join(process.cwd(), "posts", `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(fileContent);
  return { content, data };
}


export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const post =  getPostContent(slug);

  if (!post) return notFound();

  return (
    <article className="prose lg:prose-xl max-w-4xl mx-auto p-6">
      <h1>{post.data.title}</h1>
      <Markdown options={{
      overrides: {
        h1: { component: "h1", props: { className: "text-3xl font-bold mt-6 mb-4" } },
        h2: { component: "h2", props: { className: "text-2xl font-semibold mt-5 mb-3" } },
        h3: { component: "h3", props: { className: "text-xl font-semibold mt-4 mb-2" } },
        p: { component: "p", props: { className: "mb-4 leading-relaxed" } },
        code: { component: "code", props: { className: "px-1 py-0.5 rounded text-sm" } },
        pre: { component: "pre", props: { className: "bg-gray-800 text-white p-4 rounded mb-4 overflow-x-auto" } },
        a: { component: "a", props: { className: "text-blue-600 hover:underline" } },
        ul: { component: "ul", props: { className: "list-disc list-inside mb-4" } },
        ol: { component: "ol", props: { className: "list-decimal list-inside mb-4" } },
        blockquote: { component: "blockquote", props: { className: "border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4" } }
      },
    }}>{post.content}</Markdown>
    </article>
  );
}