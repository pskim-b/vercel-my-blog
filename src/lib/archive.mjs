// Use the source's calendar date, not the server/browser timezone.
export function postYear(date) {
  const match = typeof date === "string" && /^(\d{4})-\d{2}-\d{2}/.exec(date);
  return match ? match[1] : "unknown";
}

export function datePointer(date) {
  const match = typeof date === "string" && /^(\d{4})-(\d{2})/.exec(date);
  return match ? `${match[1]}년 ${match[2]}월` : "날짜 미상";
}

export function archiveYears(posts) {
  const counts = new Map();
  for (const post of posts) {
    const year = postYear(post.date);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.value.localeCompare(a.value));
}
