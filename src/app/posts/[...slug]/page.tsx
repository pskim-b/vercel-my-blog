// src/app/posts/[...slug]/page.tsx
import { notFound, redirect } from "next/navigation";
import PostMarkdown from "@/components/PostMarkdown";
import { getPostBySlug } from "@/lib/posts";
import { isAuthenticated } from "@/lib/auth";
import { classifyPost, taxonomySections } from "@/lib/taxonomy.mjs";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const slugArray = (await params).slug;
  const slug = slugArray.join('/'); // Join array back to string
  console.log("Requested slug:", slug); // Debug log
  const post = getPostBySlug(slug);

  if (!post) {
    console.log("Post not found for slug:", slug); // Debug log
    return notFound();
  }

  if (!post.meta.isPublic && !(await isAuthenticated())) {
    redirect(`/login?next=${encodeURIComponent(`/posts/${post.meta.slug}`)}`);
  }

  if (post.meta.format === "html") {
    const encodedSlug = post.meta.slug.split("/").map(encodeURIComponent).join("/");
    redirect(`/html-posts/${encodedSlug}`);
  }

  const slugSegments = post.meta.slug.split("/");
  const dirSegments = slugSegments.length > 1 ? slugSegments.slice(0, -1) : [];
  const encodedDir = dirSegments.map((seg) => encodeURIComponent(seg)).join("/");
  const isPrivate = !post.meta.isPublic;
  const section = classifyPost(post.meta).section;
  const sectionTitle = taxonomySections.find(item => item.id === section)?.title;

  const assetBasePath = encodedDir ? `/post-assets/${encodedDir}/resource` : "/post-assets/resource";

  return (
    <div
      className="markdown-page blog-shell themed-post min-h-screen"
      data-section-theme={section}
    >
      <main className="max-w-4xl mx-auto p-6">
      <Link className="post-section-back" href={{ pathname: "/", query: { section } }}>← {sectionTitle} 목록</Link>
      {/* Post Header with Meta Information */}
      <header className="mb-8 pb-6 border-b border-gray-700">
        <h1 className="post-title text-4xl font-bold mb-4 leading-tight">
          {post.meta.title}
        </h1>
        <div className="post-metadata flex flex-wrap items-center gap-4 text-sm">
          <time dateTime={post.meta.date} className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(post.meta.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="post-meta-chip px-3 py-1 rounded-full text-xs font-medium">
              {post.meta.category}
            </span>
          </span>
          {isPrivate && (
            <span className="post-private-badge rounded-full px-3 py-1 text-xs font-medium">
              private
            </span>
          )}
          {post.meta.label.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              {post.meta.label.map((label) => (
                <span
                  key={label}
                  className="post-meta-chip px-3 py-1 rounded-full text-xs font-medium"
                >
                  {label}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      <PostMarkdown content={post.content} section={section} assetBasePath={assetBasePath} />
      </main>
    </div>
  );
}
