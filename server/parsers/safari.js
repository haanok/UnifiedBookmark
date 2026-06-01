// safari.js — reads Safari's Bookmarks.plist (binary plist).
// Requires the running process to have Full Disk Access on macOS.
import fs from "node:fs";
import bplist from "bplist-parser";
import { safariBookmarksFile, safariInstalled } from "./paths.js";
import { domainOf } from "../unify.js";

// WebBookmarkTypeLeaf = an actual bookmark, WebBookmarkTypeList = a folder.
function walk(node, folder, out) {
  if (!node || typeof node !== "object") return;
  const type = node.WebBookmarkType;

  if (type === "WebBookmarkTypeLeaf" && node.URLString) {
    const title = (node.URIDictionary && node.URIDictionary.title) || node.Title || node.URLString;
    out.push({
      title,
      url: node.URLString,
      domain: domainOf(node.URLString),
      folder: folder || "Unsorted",
      // Safari rarely stores a per-bookmark date in this plist.
      dateAdded: null,
      visits: 0,
      browser: "safari",
    });
    return;
  }

  if (Array.isArray(node.Children)) {
    // The top-level container ("BookmarksBar", "BookmarksMenu", etc.) is a label;
    // use a list's Title as the folder name for its descendants.
    const label = type === "WebBookmarkTypeList" && node.Title ? node.Title : folder;
    for (const child of node.Children) walk(child, label, out);
  }
}

export function readSafari() {
  if (!safariInstalled()) return { bookmarks: [], notices: [] };

  const file = safariBookmarksFile();
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EACCES") {
      return {
        bookmarks: [],
        notices: [
          {
            browser: "safari",
            level: "permission",
            message:
              "Safari bookmarks need Full Disk Access. Grant it under System Settings → Privacy & Security → Full Disk Access (to Trove, or to your terminal in dev mode), then relaunch.",
          },
        ],
      };
    }
    return { bookmarks: [], notices: [{ browser: "safari", level: "error", message: err.message }] };
  }

  let parsed;
  try {
    [parsed] = bplist.parseBuffer(buf);
  } catch (err) {
    return { bookmarks: [], notices: [{ browser: "safari", level: "error", message: `Could not parse Bookmarks.plist: ${err.message}` }] };
  }

  const bookmarks = [];
  walk(parsed, null, bookmarks);
  return { bookmarks, notices: [] };
}
