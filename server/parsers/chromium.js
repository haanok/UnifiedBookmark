// chromium.js — reads Chrome & Edge bookmarks (shared Chromium JSON format).
import fs from "node:fs";
import { chromiumBookmarkFiles } from "./paths.js";
import { domainOf } from "../unify.js";

// Chromium stores `date_added` as microseconds since 1601-01-01 (Windows FILETIME epoch).
const WIN_EPOCH_OFFSET_MS = 11644473600000;

function chromiumTimeToMs(value) {
  if (!value) return null;
  const micros = Number(value);
  if (!Number.isFinite(micros) || micros === 0) return null;
  return Math.round(micros / 1000 - WIN_EPOCH_OFFSET_MS);
}

// Walk a Chromium bookmark node tree, collecting leaf URLs. `folder` is the
// nearest enclosing user folder name (roots like "Bookmarks Bar" are skipped as labels).
function walk(node, folder, out) {
  if (!node || typeof node !== "object") return;
  if (node.type === "url" && node.url) {
    // Only real web pages — skip chrome://, edge://, javascript: bookmarklets, etc.
    if (!/^https?:\/\//i.test(node.url)) return;
    out.push({
      title: node.name || node.url,
      url: node.url,
      domain: domainOf(node.url),
      folder: folder || "Unsorted",
      dateAdded: chromiumTimeToMs(node.date_added),
      visits: 0,
    });
    return;
  }
  if (node.type === "folder" && Array.isArray(node.children)) {
    // Use this folder's name as the folder label for its descendants.
    const label = node.name || folder;
    for (const child of node.children) walk(child, label, out);
  }
}

// browser: "chrome" | "edge". Returns { bookmarks, notices }.
export function readChromium(browser) {
  const files = chromiumBookmarkFiles(browser);
  const bookmarks = [];
  const notices = [];

  for (const { profile, file } of files) {
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch (err) {
      notices.push({ browser, level: "error", message: `Could not read ${profile}: ${err.code || err.message}` });
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      notices.push({ browser, level: "error", message: `Malformed bookmarks JSON in ${profile}` });
      continue;
    }
    const roots = data.roots || {};
    // bookmark_bar / other / synced are top-level roots; their own names are generic
    // labels, so descend into their children directly.
    for (const rootKey of ["bookmark_bar", "other", "synced"]) {
      const root = roots[rootKey];
      if (root && Array.isArray(root.children)) {
        for (const child of root.children) walk(child, null, bookmarks);
      }
    }
  }

  return { bookmarks: bookmarks.map((b) => ({ ...b, browser })), notices };
}
