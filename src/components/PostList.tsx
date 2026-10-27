import { PostMeta, getPostBySlug } from "../lib/posts";
import { compactPreview, textPalette } from "../lib/post-presentation.mjs";
import type { CSSProperties } from "react";
import { LockKeyhole } from "lucide-react";

interface PostListProps {
  posts?: PostMeta[];
}

export default function PostList({ posts = [] }: PostListProps) {
  return (
    <div className="h-screen overflow-y-scroll pr-2">
      <ul className="space-y-2">
        {posts.map((post) => {
          const postData = getPostBySlug(post.slug);
          const isPrivate = !post.isPublic;
          const palette = textPalette(post.category);
          let contentPreview = '';

          if (post.format === "html") {
            contentPreview = post.description;
          } else if (postData?.content) {
            // Read until second line break for better preview
            let rawContent = postData.content;
            const firstLineBreak = postData.content.indexOf('\n');

            if (firstLineBreak !== -1) {
              // Find the second line break
              const secondLineBreak = postData.content.indexOf('\n', firstLineBreak + 1);

              if (secondLineBreak !== -1) {
                // Take content up to the second line break
                rawContent = postData.content.substring(0, secondLineBreak);
              } else {
                // If no second line break, take content up to the first line break
                rawContent = postData.content.substring(0, firstLineBreak);
              }
            }

            // Remove HTML tags and markdown formatting
            contentPreview = rawContent
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/[#*`]/g, '') // Remove markdown formatting
              .replace(/\r/g, '') // Remove carriage returns
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim();

          }

          contentPreview = compactPreview(contentPreview);

          return (
            <li key={post.slug} className="pb-4">
              <a
                href={`/posts/${post.slug}`}
                className="post-card block rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-colors hover:bg-[var(--card-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{
                  "--card-bg": palette.background,
                  "--card-hover": palette.hover,
                  "--card-border": palette.border,
                  "--card-light-bg": palette.lightBackground,
                  "--card-light-hover": palette.lightHover,
                  "--card-light-border": palette.lightBorder,
                } as CSSProperties}
              >
                <div className="mb-3 flex h-6 min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-gray-500">
                  <time dateTime={post.date} className="shrink-0">
                    {new Date(post.date).toLocaleDateString()}
                  </time>
                  <span
                    title={post.category}
                    className="post-tint max-w-24 shrink-0 truncate rounded px-2 py-0.5"
                    style={{ "--tint-dark": palette.color, "--tint-light": palette.lightColor, backgroundColor: palette.badge } as CSSProperties}
                  >
                    {post.category}
                  </span>
                  {post.label.length > 0 && (
                    <span
                      title={post.label.join(" · ")}
                      data-post-labels
                      className="min-w-0 truncate text-[11px]"
                    >
                      {post.label.map((label, index) => (
                        <span key={`${label}-${index}`}>
                          {index > 0 && <span className="text-gray-600"> · </span>}
                          <span data-post-label title={label} className="post-tint"
                            style={{ "--tint-dark": textPalette(label).color, "--tint-light": textPalette(label).lightColor } as CSSProperties}>{label}</span>
                        </span>
                      ))}
                    </span>
                  )}
                  {isPrivate && (
                    <span
                      role="img"
                      aria-label="비공개 글"
                      title="비공개 글"
                      className="post-tint ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded"
                      style={{ "--tint-dark": palette.color, "--tint-light": palette.lightColor, backgroundColor: palette.badge } as CSSProperties}
                    >
                      <LockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <h2 className="mb-2 break-keep text-2xl font-extrabold text-white [overflow-wrap:anywhere] hover:text-gray-100">
                  {post.title}
                </h2>
                <p className="mb-3 line-clamp-2 break-keep text-base font-normal leading-relaxed text-gray-400 [overflow-wrap:anywhere]">
                  {contentPreview}
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
