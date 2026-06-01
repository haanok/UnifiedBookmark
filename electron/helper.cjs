// helper.cjs — the local "Trove helper" HTTP server the browser extension reads from.
// Started by the desktop app after its initial bookmark scan. Uses only node:http (no
// extra deps, stays out of the packaged bundle). The app decides whether it keeps running
// or auto-stops once the browser has synced.
const http = require("node:http");
const fs = require("node:fs");

function loadSettings(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}
function saveSettings(file, s) {
  try {
    fs.writeFileSync(file, JSON.stringify(s, null, 2));
  } catch {
    /* best-effort */
  }
}

// getBookmarks / checkAndFold come from server/core.js (shared with the dev server).
function createHelper({ port = 4174, settingsFile, getBookmarks, checkAndFold }) {
  let server = null;
  let lastServedAt = null;
  let stopTimer = null;
  const settings = loadSettings(settingsFile);
  let autoStop = !!settings.autoStop; // false = keep running while the app is open

  const setCors = (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  };
  const json = (res, code, obj) => {
    setCors(res);
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  function scheduleAutoStop() {
    if (!autoStop) return;
    clearTimeout(stopTimer);
    // Give the extension a moment to finish syncing, then stop. The extension caches the
    // payload, so its new-tab page keeps working after the server goes away.
    stopTimer = setTimeout(() => stop(), 3000);
  }

  async function handle(req, res) {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === "OPTIONS") {
      setCors(res);
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      if (url.pathname === "/api/health") return json(res, 200, { ok: true, autoStop });
      if (url.pathname === "/api/bookmarks" && req.method === "GET") {
        const data = getBookmarks({ refresh: url.searchParams.get("refresh") === "1" });
        lastServedAt = Date.now();
        json(res, 200, data);
        scheduleAutoStop();
        return;
      }
      if (url.pathname === "/api/check-links" && req.method === "POST") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const ids = body ? JSON.parse(body).ids || null : null;
        return json(res, 200, await checkAndFold(ids));
      }
      json(res, 404, { error: "not found" });
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  }

  function start() {
    if (server) return status();
    clearTimeout(stopTimer);
    server = http.createServer((req, res) => handle(req, res));
    server.on("error", (e) => console.error("[helper] server error:", e.message));
    server.listen(port, "127.0.0.1", () => console.log(`[helper] listening on http://127.0.0.1:${port}`));
    return status();
  }
  function stop() {
    clearTimeout(stopTimer);
    if (server) {
      server.close();
      server = null;
      console.log("[helper] stopped");
    }
    return status();
  }
  function setAutoStop(v) {
    autoStop = !!v;
    settings.autoStop = autoStop;
    saveSettings(settingsFile, settings);
    return status();
  }
  const status = () => ({ running: !!server, port, autoStop, lastServedAt });

  return { start, stop, setAutoStop, status };
}

module.exports = { createHelper };
