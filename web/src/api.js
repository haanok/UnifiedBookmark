// api.js — thin client for the Trove local backend (proxied at /api by Vite).

export async function fetchBookmarks({ refresh = false } = {}) {
  const res = await fetch(`/api/bookmarks${refresh ? "?refresh=1" : ""}`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

// Check link health for the given bookmark ids (or all if omitted).
// Returns { results: { [id]: { status, error } }, broken }.
export async function checkLinks(ids) {
  const res = await fetch("/api/check-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  if (!res.ok) throw new Error(`Link check returned ${res.status}`);
  return res.json();
}
