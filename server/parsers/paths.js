// paths.js — macOS profile/store discovery for each browser.
// Detects which browsers are actually installed and where their bookmark stores live.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const HOME = os.homedir();
const APP_SUPPORT = path.join(HOME, "Library", "Application Support");

// Chromium-family base dirs (Chrome + Edge share the same on-disk format).
const CHROMIUM_BASES = {
  chrome: path.join(APP_SUPPORT, "Google", "Chrome"),
  edge: path.join(APP_SUPPORT, "Microsoft Edge"),
};

const FIREFOX_BASE = path.join(APP_SUPPORT, "Firefox");
const SAFARI_PLIST = path.join(HOME, "Library", "Safari", "Bookmarks.plist");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// Return every Chromium profile dir (Default, Profile 1, …) that has a Bookmarks file.
export function chromiumBookmarkFiles(browser) {
  const base = CHROMIUM_BASES[browser];
  if (!base || !exists(base)) return [];
  let entries;
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name !== "Default" && !name.startsWith("Profile ")) continue;
    const bookmarks = path.join(base, name, "Bookmarks");
    if (exists(bookmarks)) files.push({ profile: name, file: bookmarks });
  }
  return files;
}

// Parse Firefox profiles.ini to find the default profile's places.sqlite.
export function firefoxPlacesFile() {
  const iniPath = path.join(FIREFOX_BASE, "profiles.ini");
  if (!exists(iniPath)) return null;

  let ini;
  try {
    ini = fs.readFileSync(iniPath, "utf8");
  } catch {
    return null;
  }

  // profiles.ini is split into [Profile0], [Install...] sections.
  // Prefer an [Install*] Default= entry (the actively used profile); fall back to
  // a [Profile*] with Default=1, then the first profile found.
  const sections = parseIni(ini);
  let relPath = null;

  for (const [name, kv] of Object.entries(sections)) {
    if (name.startsWith("Install") && kv.Default) {
      relPath = kv.Default;
      break;
    }
  }
  if (!relPath) {
    const profiles = Object.entries(sections).filter(([n]) => n.startsWith("Profile"));
    const def = profiles.find(([, kv]) => kv.Default === "1");
    const chosen = def || profiles[0];
    if (chosen) relPath = chosen[1].Path;
  }
  if (!relPath) return null;

  const profileDir = path.isAbsolute(relPath) ? relPath : path.join(FIREFOX_BASE, relPath);
  const places = path.join(profileDir, "places.sqlite");
  return exists(places) ? places : null;
}

export function safariBookmarksFile() {
  // We return the path whether or not it's readable; the reader surfaces a
  // Full Disk Access notice if the OS denies the read.
  return SAFARI_PLIST;
}

export function safariInstalled() {
  return exists(SAFARI_PLIST) || exists(path.join(HOME, "Library", "Safari"));
}

function parseIni(text) {
  const sections = {};
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const sec = line.match(/^\[(.+)\]$/);
    if (sec) {
      current = sec[1];
      sections[current] = {};
      continue;
    }
    const eq = line.indexOf("=");
    if (current && eq > -1) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      sections[current][key] = value;
    }
  }
  return sections;
}
