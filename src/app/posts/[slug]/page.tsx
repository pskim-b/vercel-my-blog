// src/app/posts/[slug]/page.tsx
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import Markdown from "markdown-to-jsx";
import CodeBlock from "@/components/CodeBlock";

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
    <div className="max-w-4xl mx-auto p-6">
      {/* Post Header with Meta Information */}
      <header className="mb-8 pb-6 border-b border-gray-700">
        <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
          {post.data.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <time dateTime={post.data.date} className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(post.data.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
              {post.data.category}
            </span>
          </span>
        </div>
      </header>

      {/* Post Content */}
      <article className="max-w-none bg-black text-white">
        <Markdown options={{
          overrides: {
            h1: { 
              component: "h1", 
              props: { className: "text-3xl font-bold mt-8 mb-6 text-white border-b border-gray-700 pb-2 bg-black" } 
            },
            h2: { 
              component: "h2", 
              props: { className: "text-2xl font-semibold mt-8 mb-4 text-white bg-black" } 
            },
            h3: { 
              component: "h3", 
              props: { className: "text-xl font-semibold mt-6 mb-3 text-white bg-black" } 
            },
            p: { 
              component: "p", 
              props: { className: "mb-6 leading-relaxed text-gray-300 text-lg bg-black" } 
            },
            code: { 
              component: "code", 
              props: { className: "bg-gray-800 text-gray-200 px-2 py-1 rounded-md text-sm font-mono border border-gray-700 shadow-sm" } 
            },
            pre: { 
              component: CodeBlock,
            },
            a: { 
              component: "a", 
              props: { className: "text-blue-400 hover:text-blue-300 hover:underline font-medium" } 
            },
            ul: { 
              component: "ul", 
              props: { className: "list-disc list-inside mb-6 space-y-2 text-gray-300 bg-black" } 
            },
            ol: { 
              component: "ol", 
              props: { className: "list-decimal list-inside mb-6 space-y-2 text-gray-300 bg-black" } 
            },
            li: {
              component: "li",
              props: { className: "text-gray-300 leading-relaxed bg-black" }
            },
            blockquote: { 
              component: "blockquote", 
              props: { className: "border-l-4 border-blue-500 pl-6 italic text-gray-400 my-6 bg-gray-900 py-4 rounded-r-lg" } 
            },
            strong: {
              component: "strong",
              props: { className: "font-semibold text-white" }
            },
            em: {
              component: "em",
              props: { className: "italic text-gray-300" }
            }
          },
        }}>
          {post.content}
        </Markdown>
      </article>
    </div>
  );
}