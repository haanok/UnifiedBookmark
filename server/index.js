// index.js — Trove local dev backend. Exposes the shared core logic over HTTP so the
// web UI can be developed in a normal browser. (The packaged desktop app uses IPC
// instead — see electron/main.js — and never starts this server.)
import express from "express";
import cors from "cors";
import { getBookmarks, checkAndFold, refresh } from "./core.js";

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/bookmarks", (req, res) => {
  try {
    res.json(getBookmarks({ refresh: req.query.refresh === "1" }));
  } catch (err) {
    console.error("Failed to collect bookmarks:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/check-links  body: { ids?: string[] }
app.post("/api/check-links", async (req, res) => {
  try {
    const ids = req.body && Array.isArray(req.body.ids) ? req.body.ids : null;
    res.json(await checkAndFold(ids));
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
