// main.cjs — Trove desktop app (Electron) main process.
// Reads the browser bookmark stores on each launch and serves the React UI over IPC.
// No HTTP server, no port — nothing runs when the app is closed.
//
// CommonJS is used here deliberately: require("electron") reliably returns Electron's
// internal API in the main process. The core logic lives in ESM (server/core.js), which
// Electron's Node (v24+) can load via require() of an ES module.
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

// server/core.js is ESM; require() of ESM returns its namespace (no top-level await there).
const { getBookmarks, checkAndFold } = require("../server/core.js");
const { createHelper } = require("./helper.cjs");

const isDev = process.env.VITE_DEV === "1";
let helper = null; // local HTTP server the browser extension reads from

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#0a0a0c", // matches the condensed view, avoids white flash
    title: "Trove",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open target=_blank bookmark links in the user's default browser, not a new app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    // The Vite dev server may not be up yet when Electron launches; retry the load.
    const tryLoad = () => win.loadURL("http://localhost:5173").catch(() => setTimeout(tryLoad, 400));
    tryLoad();
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "web", "dist", "index.html"));
  }
}

// IPC — the renderer's only path to bookmark data. getBookmarks forces a fresh scan,
// so every launch (and every reload) re-reads the real browser files.
ipcMain.handle("trove:getBookmarks", () => getBookmarks({ refresh: true }));
ipcMain.handle("trove:checkLinks", (_e, ids) => checkAndFold(ids));

// IPC — control the browser-extension helper server from the app UI.
ipcMain.handle("trove:helperStatus", () => (helper ? helper.status() : { running: false, port: 4174, autoStop: false }));
ipcMain.handle("trove:helperStart", () => helper && helper.start());
ipcMain.handle("trove:helperStop", () => helper && helper.stop());
ipcMain.handle("trove:helperSetAutoStop", (_e, v) => helper && helper.setAutoStop(v));

app.whenReady().then(() => {
  // Initial cross-browser scan on launch, then start the helper so the extension can sync.
  try {
    getBookmarks({ refresh: true });
  } catch (err) {
    console.error("Initial scan failed:", err.message);
  }
  helper = createHelper({
    settingsFile: path.join(app.getPath("userData"), "trove-settings.json"),
    getBookmarks,
    checkAndFold,
  });
  helper.start();

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => helper && helper.stop());

app.on("window-all-closed", () => {
  if (helper) helper.stop();
  if (process.platform !== "darwin") app.quit();
});
