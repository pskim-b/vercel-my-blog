import { getPostHtml, getPostSlugs } from '@/lib/posts';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostHtml(slug);

  if (!post) return notFound();

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{post.date}</p>
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </main>
  );
}
