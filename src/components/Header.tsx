"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface FilterOption {
  value: string;
  count: number;
}

interface HeaderProps {
  categories?: FilterOption[];
  labels?: FilterOption[];
  authenticated?: boolean;
  activeFilter?: {
    type: "category" | "label";
    value: string;
  } | null;
}

export default function Header({
  categories = [],
  labels = [],
  authenticated = false,
  activeFilter = null,
}: HeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <header className="text-left py-4 px-4 border-b border-gray-700 mt-8">
      <div className="relative inline-flex items-center gap-1">
        <div className="flex items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo3_theengineerof.png"
              alt="The Engineer of Logo"
              width={240}
              height={80}
              className="object-contain"
              priority
            />
          </Link>

          <button
            type="button"
            aria-label="Browse categories and labels"
            aria-expanded={isFilterOpen}
            aria-controls="post-filter-menu"
            onClick={() => setIsFilterOpen((open) => !open)}
            className="inline-flex h-14 w-14 items-center justify-center rounded text-6xl font-black leading-none text-teal-400 transition-colors hover:bg-gray-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            *
          </button>
        </div>

        {isFilterOpen && (
          <div
            id="post-filter-menu"
            className="absolute left-0 top-full z-20 mt-3 w-72 rounded border border-gray-700 bg-black p-4 shadow-xl"
          >
            <div className="mb-4">
              <Link
                href="/"
                onClick={() => setIsFilterOpen(false)}
                className={`block rounded px-3 py-2 text-sm transition-colors ${
                  activeFilter
                    ? "text-gray-300 hover:bg-gray-900 hover:text-white"
                    : "bg-gray-800 text-white"
                }`}
              >
                All posts
              </Link>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">Category</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category.value}
                      href={{ pathname: "/", query: { category: category.value } }}
                      onClick={() => setIsFilterOpen(false)}
                      className={`rounded px-2 py-1 text-xs transition-colors ${
                        activeFilter?.type === "category" && activeFilter.value === category.value
                          ? "bg-gray-200 text-black"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {category.value} <span className="text-gray-500">{category.count}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {labels.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">Label</h2>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <Link
                        key={label.value}
                        href={{ pathname: "/", query: { label: label.value } }}
                        onClick={() => setIsFilterOpen(false)}
                        className={`rounded-sm border px-2 py-1 text-xs transition-colors ${
                          activeFilter?.type === "label" && activeFilter.value === label.value
                            ? "border-gray-200 text-white"
                            : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                        }`}
                      >
                        {label.value} <span className="text-gray-600">{label.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-800 pt-4">
                {authenticated ? (
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="w-full rounded border border-cyan-500/70 bg-gray-900 px-3 py-2 text-left text-sm font-bold uppercase tracking-wide text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-gray-800 hover:text-white"
                    >
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsFilterOpen(false)}
                    className="block rounded border border-cyan-500/70 bg-gray-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-gray-800 hover:text-white"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
