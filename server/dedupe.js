// dedupe.js — flag bookmarks that point at the same page (mirrors the prototype's logic).

// Normalize a URL so trivial differences (scheme, trailing slash, case) collapse together.
export function normalizeUrl(url) {
  return (url || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

// Mutates the list in place: any normalized URL shared by 2+ bookmarks gets a dupeGroup id.
export function markDuplicates(bookmarks) {
  const groups = {};
  for (const b of bookmarks) {
    const key = normalizeUrl(b.url);
    (groups[key] = groups[key] || []).push(b);
  }
  let gid = 1;
  for (const items of Object.values(groups)) {
    if (items.length > 1) {
      const id = `dg${gid++}`;
      for (const b of items) b.dupeGroup = id;
    }
  }
  return bookmarks;
}
