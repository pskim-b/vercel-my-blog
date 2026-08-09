import { PostMeta, getPostBySlug } from "../lib/posts";

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
          let contentPreview = '';

          if (postData?.content) {
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

            // If still too long, truncate to 150 characters
            if (contentPreview.length > 150) {
              contentPreview = contentPreview.substring(0, 150) + '...';
            }
          }

          return (
            <li key={post.slug} className="pb-4">
              <a
                href={`/posts/${post.slug}`}
                className={`block rounded-lg border p-4 transition-colors ${
                  isPrivate
                    ? "border-red-950 bg-[radial-gradient(circle_at_top_left,#3f1111_0,#140606_42%,#000_88%)] hover:border-red-900 hover:bg-[radial-gradient(circle_at_top_left,#4a1414_0,#180707_42%,#000_88%)]"
                    : "border-transparent bg-black hover:bg-gray-900"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-500 flex flex-col gap-1 items-start mr-4">
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        isPrivate ? "bg-red-900/60 text-red-100" : "bg-gray-800 text-cyan-300"
                      }`}
                    >
                      {post.category}
                    </span>
                    {post.label.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {post.label.map((label) => (
                          <span
                            key={label}
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isPrivate ? "bg-red-900/40 text-red-100" : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl text-white hover:text-gray-100 font-extrabold mb-2">
                      {post.title}
                    </h2>
                    <p className="text-base text-gray-400 mb-3 leading-relaxed font-bold">
                      {contentPreview}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
