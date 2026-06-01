// api.js — data client. Trove's UI runs in three places and this picks the right source:
//   1. Desktop app (Electron)  → window.trove IPC.
//   2. Browser extension        → fetch the Trove helper on localhost, cache the last sync
//                                 in chrome.storage so the new tab still works when it's offline.
//   3. Browser dev              → the local Express server (proxied at /api by Vite).
// The rest of the app is agnostic to which.

// The helper the extension reads from. The desktop app serves on 4174; the dev server
// (npm run dev:server) serves on 4000. Try both so either works as the helper.
const HELPER_URLS = ["http://127.0.0.1:4174", "http://127.0.0.1:4000"];

const electron = typeof window !== "undefined" && window.trove?.isElectron ? window.trove : null;
const ext =
  !electron && typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local
    ? chrome
    : null;

async function extGetCache() {
  const o = await ext.storage.local.get(["troveData", "troveSyncedAt"]);
  return o.troveData ? { data: o.troveData, at: o.troveSyncedAt } : null;
}
async function extSetCache(data) {
  try {
    await ext.storage.local.set({ troveData: data, troveSyncedAt: Date.now() });
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

// Try each helper URL in turn; return the first JSON response.
async function extFetchJSON(path, opts) {
  let lastErr;
  for (const base of HELPER_URLS) {
    try {
      const res = await fetch(base + path, opts);
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("helper unreachable");
}

export async function fetchBookmarks({ refresh = false } = {}) {
  if (electron) return electron.getBookmarks();

  if (ext) {
    try {
      const data = await extFetchJSON(`/api/bookmarks${refresh ? "?refresh=1" : ""}`);
      await extSetCache(data);
      return data;
    } catch {
      // Helper not reachable (app closed / auto-stopped): show the last sync if we have it.
      const cached = await extGetCache();
      if (cached) {
        const when = cached.at ? new Date(cached.at).toLocaleString() : "earlier";
        return {
          ...cached.data,
          notices: [
            ...(cached.data.notices || []),
            { browser: "helper", level: "permission", message: `Showing your last sync (${when}). Open the Trove app to refresh.` },
          ],
        };
      }
      throw new Error("Trove helper isn't running");
    }
  }

  const res = await fetch(`/api/bookmarks${refresh ? "?refresh=1" : ""}`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

// Check link health for the given bookmark ids (or all if omitted).
// Returns { results: { [id]: { status, error } }, broken }.
export async function checkLinks(ids) {
  if (electron) return electron.checkLinks(ids ?? null);

  if (ext) {
    return extFetchJSON("/api/check-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    });
  }

  const res = await fetch("/api/check-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  if (!res.ok) throw new Error(`Link check returned ${res.status}`);
  return res.json();
}
