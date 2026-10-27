export function scheduledTheme(now) {
  const hour = new Date(now + 9 * 60 * 60 * 1000).getUTCHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function nextThemeBoundary(now) {
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  return Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + (hour >= 18 ? 1 : 0),
    hour < 6 || hour >= 18 ? 6 : 18) - 9 * 60 * 60 * 1000;
}

// Runs before first paint; owns the timer independently of React page navigation.
export function themeBootstrap(schedule, boundary) {
  const key = "blog-theme-preference";
  let preference = null;
  let timer;
  function refresh(readStorage = true) {
    const now = Date.now();
    if (readStorage) {
      try { preference = JSON.parse(localStorage.getItem(key) || "null"); } catch { /* Storage may be unavailable. */ }
    }
    if (!preference || !["light", "dark"].includes(preference.theme) ||
        !Number.isFinite(preference.expiresAt) || preference.expiresAt <= now ||
        preference.expiresAt > boundary(now)) {
      preference = null;
      try { localStorage.removeItem(key); } catch { /* Keep automatic mode without storage. */ }
    }
    document.documentElement.dataset.theme = preference?.theme || schedule(now);
    window.dispatchEvent(new Event("blog-theme-change"));
    clearTimeout(timer);
    timer = setTimeout(refresh, Math.max(1, boundary(now) - now));
  }
  window.addEventListener("blog-theme-select", event => {
    if (!["light", "dark"].includes(event.detail)) return;
    preference = { theme: event.detail, expiresAt: boundary(Date.now()) };
    try { localStorage.setItem(key, JSON.stringify(preference)); } catch { /* Keep the in-memory selection. */ }
    refresh(false);
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  window.addEventListener("storage", event => { if (event.key === key || event.key === null) refresh(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  refresh();
}

export const themeInitScript = `(${themeBootstrap.toString()})(${scheduledTheme.toString()},${nextThemeBoundary.toString()});`;
