import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import PostList from "@/components/PostList";
import { getPrivateMemos } from "../../lib/posts";

export default function MemosPage() {
  const memos = getPrivateMemos();
  
  return (
    <div>
      <Header />
      <main className="flex max-w-6xl mx-auto p-6 gap-8">
        <aside className="w-1/3">
          <Sidebar />
        </aside>
        <section className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Private Memos</h1>
            <p className="text-gray-600">Your personal notes and thoughts</p>
          </div>
          <PostList posts={memos} />
        </section>
      </main>
    </div>
  );
} 