// core.js — framework-agnostic bookmark logic shared by the Express dev server
// (server/index.js) and the Electron app (electron/main.js).
import { collectBookmarks } from "./unify.js";
import { checkLinks } from "./linkChecker.js";

// Last collected snapshot, kept so checkAndFold can resolve ids → urls without
// re-reading every browser file.
let snapshot = null;

export function refresh() {
  snapshot = collectBookmarks();
  return snapshot;
}

// Return the unified bookmark payload. Pass { refresh: true } to force a fresh
// scan of the browser stores (the desktop app does this on every launch).
export function getBookmarks({ refresh: force = false } = {}) {
  return force || !snapshot ? refresh() : snapshot;
}

// Run live link checks for the given bookmark ids (or all if omitted), fold the
// results back into the snapshot, and return { results, checkedAt, broken }.
export async function checkAndFold(ids) {
  if (!snapshot) refresh();
  const requested = Array.isArray(ids) ? new Set(ids) : null;
  const targets = snapshot.bookmarks
    .filter((b) => (requested ? requested.has(b.id) : true))
    .map((b) => ({ id: b.id, url: b.url }));

  const { results, checkedAt } = await checkLinks(targets);

  for (const b of snapshot.bookmarks) {
    if (results[b.id]) {
      b.status = results[b.id].status;
      b.error = results[b.id].error;
    }
  }
  snapshot.stats.broken = snapshot.bookmarks.filter((b) => b.status === "broken").length;

  return { results, checkedAt, broken: snapshot.stats.broken };
}
