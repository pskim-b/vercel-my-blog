"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("blog-theme-change", callback);
  return () => window.removeEventListener("blog-theme-change", callback);
}

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || "dark", () => "dark");
  const dark = theme === "dark";
  const Icon = dark ? Moon : Sun;
  return (
    <div className="theme-switch mb-4 flex justify-end">
      <button type="button" role="switch" aria-checked={dark} aria-label="다크 테마"
        title={dark ? "라이트 테마로 전환" : "다크 테마로 전환"}
        onClick={() => window.dispatchEvent(new CustomEvent("blog-theme-select", { detail: dark ? "light" : "dark" }))}
        className="theme-toggle relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500">
        <span className="theme-thumb absolute left-[3px] top-[3px] flex h-6 w-6 items-center justify-center rounded-full transition-transform motion-reduce:transition-none"
          style={{ transform: `translateX(${dark ? 24 : 0}px)` }}>
          <Icon size={15} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
