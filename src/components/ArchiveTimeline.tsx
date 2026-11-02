"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { datePointer } from "@/lib/archive.mjs";

interface ArchiveTimelineProps {
  children: ReactNode;
  years: { value: string; count: number }[];
  selectedYear?: string;
  filter?: { section?: string; category?: string; label?: string };
  firstDate?: string;
}

export default function ArchiveTimeline({ children, years, selectedYear, filter = {}, firstDate = "" }: ArchiveTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(firstDate);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.scrollTop = 0;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-post-date]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = Math.max(root.getBoundingClientRect().top, indexRef.current?.getBoundingClientRect().bottom ?? 0);
      // Find the first card still visible without scanning decades of posts on every scroll.
      let low = 0;
      let high = cards.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (cards[middle].getBoundingClientRect().bottom <= top) low = middle + 1;
        else high = middle;
      }
      setCurrentDate(cards[Math.min(low, cards.length - 1)]?.dataset.postDate ?? "");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [children]);

  return (
    <section aria-label="글 보관함" className="min-w-0">
      <div ref={indexRef} className="archive-index">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">연도별 보기</h2>
          <output aria-label="현재 읽는 글의 날짜" className="archive-date-pointer">
            {currentDate ? datePointer(currentDate) : "글 없음"}
          </output>
        </div>
        <nav aria-label="연도별 글 인덱스" className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/", query: filter }} aria-current={!selectedYear ? "page" : undefined}>전체 연도</Link>
          {years.map(year => (
            <Link key={year.value} href={{ pathname: "/", query: { ...filter, year: year.value } }}
              aria-current={selectedYear === year.value ? "page" : undefined}>
              {year.value === "unknown" ? "날짜 미상" : year.value} <span className="opacity-60">{year.count}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div ref={rootRef} data-archive-scroll className="h-screen overflow-y-auto pr-2" tabIndex={0} aria-label="작성일순 글 목록">
        {children}
      </div>
    </section>
  );
}
