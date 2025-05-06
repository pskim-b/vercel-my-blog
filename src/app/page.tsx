import Link from 'next/link';
import { getPostSlugs, getPostBySlug } from '@/lib/posts';

export default function HomePage() {
  const slugs = getPostSlugs();
  const posts = slugs.map(getPostBySlug);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Blog</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/posts/${post.slug}`} className="text-blue-600 underline">
              {post.title}
            </Link>
            <p className="text-sm text-gray-500">{post.date}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
