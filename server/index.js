// index.js — Trove local backend. Reads real browser bookmarks and exposes a JSON API.
import express from "express";
import cors from "cors";
import { collectBookmarks } from "./unify.js";
import { checkLinks } from "./linkChecker.js";

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

// Cache the last collected snapshot so /api/check-links can resolve ids to URLs
// without re-reading every browser file.
let snapshot = null;
function refresh() {
  snapshot = collectBookmarks();
  return snapshot;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/bookmarks", (req, res) => {
  try {
    const fresh = req.query.refresh === "1" || !snapshot;
    const data = fresh ? refresh() : snapshot;
    res.json(data);
  } catch (err) {
    console.error("Failed to collect bookmarks:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/check-links  body: { ids?: string[] }
// Checks the given bookmark ids (or all bookmarks if omitted) and returns broken results.
app.post("/api/check-links", async (req, res) => {
  try {
    if (!snapshot) refresh();
    const requested = Array.isArray(req.body && req.body.ids) ? new Set(req.body.ids) : null;
    const targets = snapshot.bookmarks
      .filter((b) => (requested ? requested.has(b.id) : true))
      .map((b) => ({ id: b.id, url: b.url }));

    const { results, checkedAt } = await checkLinks(targets);

    // Fold results back into the snapshot so subsequent GETs reflect link status.
    for (const b of snapshot.bookmarks) {
      if (results[b.id]) {
        b.status = results[b.id].status;
        b.error = results[b.id].error;
      }
    }
    snapshot.stats.broken = snapshot.bookmarks.filter((b) => b.status === "broken").length;

    res.json({ results, checkedAt, broken: snapshot.stats.broken });
  } catch (err) {
    console.error("Link check failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Trove backend listening on http://localhost:${PORT}`);
  // Warm the snapshot on startup so the first request is fast.
  try {
    const data = refresh();
    console.log(`Loaded ${data.bookmarks.length} bookmarks across ${data.browserOrder.filter((id) => data.browsers[id].count).length} browser(s).`);
    for (const n of data.notices) console.log(`  [${n.browser}] ${n.message}`);
  } catch (err) {
    console.error("Initial collection failed:", err.message);
  }
});
