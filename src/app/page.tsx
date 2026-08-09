import Header from "@/components/Header";
import { getAllPosts } from "../lib/posts";
import PostList from "@/components/PostList";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function countValues(values: string[]) {
  return Array.from(
    values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  )
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const authenticated = await isAuthenticated();
  const allPosts = getAllPosts().filter((post) => authenticated || post.isPublic);
  const params = searchParams ? await searchParams : {};
  const selectedCategory = firstParam(params.category);
  const selectedLabel = selectedCategory ? undefined : firstParam(params.label);
  const activeFilter = selectedCategory
    ? { type: "category" as const, value: selectedCategory }
    : selectedLabel
      ? { type: "label" as const, value: selectedLabel }
      : null;
  const filteredPosts = selectedCategory
    ? allPosts.filter((post) => post.category === selectedCategory)
    : selectedLabel
      ? allPosts.filter((post) => post.label.includes(selectedLabel))
      : allPosts;
  const categories = countValues(allPosts.map((post) => post.category));
  const labels = countValues(allPosts.flatMap((post) => post.label));

  return (
    <div>
      <Header
        categories={categories}
        labels={labels}
        authenticated={authenticated}
        activeFilter={activeFilter}
      />
      <main className="max-w-4xl mx-auto p-6">
        <PostList posts={filteredPosts} />
      </main>
    </div>
  );
}
