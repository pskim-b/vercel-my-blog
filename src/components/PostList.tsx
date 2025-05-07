"use client";

import { useState } from "react";
import { PostMeta } from "../lib/posts";

const POSTS_PER_PAGE = 3;

interface PostListProps {
  posts?: PostMeta[];
}

export default function PostList({ posts = [] }: PostListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const visiblePosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <div>
      <ul className="space-y-6">
        {visiblePosts.map((post) => (
          <li key={post.slug}>
            <a href={`/posts/${post.slug}`} className="text-xl text-blue-600 hover:underline font-semibold">
              {post.title}
            </a>
            <div className="text-sm text-gray-500 flex gap-2 items-center">
              <span>{new Date(post.date).toLocaleDateString()}</span>
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{post.category}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 border rounded ${page === currentPage ? "bg-red-600 text-white" : "bg-white text-red-600 border-red-600"}`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
