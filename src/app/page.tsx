import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import PostList from "@/components/PostList";
import { getAllPosts } from "../lib/posts";

export default function HomePage() {
  return (
    <div>
      <Header />
      <main className="flex max-w-6xl mx-auto p-6 gap-8">
        <aside className="w-1/3">
          <Sidebar />
        </aside>
        <section className="flex-1">
          <PostList posts={getAllPosts()}/>
        </section>
      </main>
    </div>
  );
}