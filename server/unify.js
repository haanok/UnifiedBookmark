// unify.js — merge per-browser bookmark lists into the single model the UI consumes.
import { readChromium } from "./parsers/chromium.js";
import { readFirefox } from "./parsers/firefox.js";
import { readSafari } from "./parsers/safari.js";
import { markDuplicates } from "./dedupe.js";

// Shared by the parsers: extract a clean hostname from a URL.
export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return (url || "").replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

const BROWSER_META = {
  chrome: { id: "chrome", name: "Chrome", color: "#4285F4" },
  firefox: { id: "firefox", name: "Firefox", color: "#FF6611" },
  edge: { id: "edge", name: "Edge", color: "#2FB6C9" },
  safari: { id: "safari", name: "Safari", color: "#22C3F5" },
};
const BROWSER_ORDER = ["chrome", "firefox", "edge", "safari"];

// Folder palette carried over from the design; unknown folders get a stable hashed hue.
const FOLDER_COLORS = {
  Dev: "#8B5CF6",
  Design: "#EC4899",
  Reading: "#F59E0B",
  Work: "#10B981",
  Media: "#06B6D4",
  Shopping: "#F43F5E",
  Recipes: "#84CC16",
};

function folderColor(name) {
  if (FOLDER_COLORS[name]) return FOLDER_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `oklch(0.62 0.15 ${h % 360})`;
}

// Build the full { bookmarks, browsers, browserOrder, folders, stats, notices } payload.
export function collectBookmarks() {
  const sources = [
    readChromium("chrome"),
    readFirefox(),
    readChromium("edge"),
    readSafari(),
  ];

  const notices = [];
  let all = [];
  for (const src of sources) {
    notices.push(...src.notices);
    all.push(...src.bookmarks);
  }

  // Assign stable per-browser ids and a fallback date for sorting.
  const counters = {};
  all = all.map((b) => {
    counters[b.browser] = (counters[b.browser] || 0) + 1;
    return {
      id: `${b.browser}-${counters[b.browser]}`,
      title: b.title,
      domain: b.domain,
      url: b.url,
      browser: b.browser,
      folder: b.folder,
      dateAdded: b.dateAdded ?? 0,
      visits: b.visits || 0,
      status: "ok",
      error: null,
      dupeGroup: null,
    };
  });

  markDuplicates(all);

  // browsers map with real counts (libCount mirrors count for real data).
  const browsers = {};
  for (const id of BROWSER_ORDER) {
    const count = all.filter((b) => b.browser === id).length;
    browsers[id] = { ...BROWSER_META[id], count, libCount: count };
  }

  // folders with counts.
  const folderCounts = {};
  for (const b of all) folderCounts[b.folder] = (folderCounts[b.folder] || 0) + 1;
  const folders = Object.keys(folderCounts)
    .sort((a, b) => folderCounts[b] - folderCounts[a])
    .map((name) => ({ name, color: folderColor(name), count: folderCounts[name] }));

  const total = all.length;
  const duplicates = all.filter((b) => b.dupeGroup).length;

  return {
    bookmarks: all,
    browsers,
    browserOrder: BROWSER_ORDER,
    folders,
    stats: {
      total,
      shown: total,
      duplicates,
      broken: 0,
      dupePct: total ? Math.round((duplicates / total) * 100) : 0,
    },
    notices,
  };
}
