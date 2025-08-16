'use client';

import { useState } from 'react';
import PostList from './PostList';
import { PostMeta } from '../lib/posts';

interface TabContentProps {
  publicPosts: PostMeta[];
  privateMemos: PostMeta[];
}

export default function TabContent({ publicPosts, privateMemos }: TabContentProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'memos'>('posts');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Blog Posts ({publicPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('memos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'memos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Private Memos 🔒 ({privateMemos.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'posts' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Public Articles</h2>
              <p className="text-gray-600">Thoughts and projects I want to share</p>
            </div>
            <PostList posts={publicPosts} />
          </div>
        )}

        {activeTab === 'memos' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Private Notes</h2>
              <p className="text-gray-600">Personal thoughts and reflections</p>
            </div>
            <PostList posts={privateMemos} />
          </div>
        )}
      </div>
    </div>
  );
} 