/** Plain text only: React renders excerpts, never post-authored HTML. */
export function excerptText(content, limit = 200) {
  const text = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*#{1,6}\s+.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*`_>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(
    new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text),
    (item) => item.segment,
  );
  return chars.slice(0, limit).join("") + (chars.length > limit ? "…" : "");
}

export function sectionDate(post, section) {
  return section === "exercise" &&
    /^\d{4}-\d{2}-\d{2}$/.test(post.activityDate ?? "") &&
    Number.isFinite(Date.parse(post.activityDate))
    ? post.activityDate
    : post.date;
}

export function isWithinTopic(paths, topic) {
  return paths.some((path) => path === topic || path.startsWith(`${topic}/`));
}

/** Only explicitly labeled distance/pace values, not numbers elsewhere in a post. */
export function runningMetrics(content) {
  const summary = content.slice(0, 2200).replace(/\*\*/g, "");
  const distance = summary.match(
    /(?:^|\n)\s*(?:[-|]\s*)?거리\s*[:|]\s*(\d+(?:\.\d+)?)\s*km\b/i,
  )?.[1];
  const pace = summary.match(
    /(?:^|\n)\s*(?:[-|]\s*)?평균 페이스\s*[:|]\s*(\d+\s*['′’]\s*\d+\s*["″”]?)\s*\/\s*km/i,
  )?.[1];
  return { distance, pace };
}
