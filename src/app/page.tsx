import Header from "@/components/Header";
import { getAllPosts } from "../lib/posts";
import PostList from "@/components/PostList";

export default function HomePage() {
  const allPosts = getAllPosts();

  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto p-6">
        <PostList posts={allPosts} />
      </main>
    </div>
  );
}