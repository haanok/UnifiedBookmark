// preload.cjs — secure bridge between the renderer and the main process.
// Exposes a minimal window.trove API; the renderer never touches Node directly.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trove", {
  isElectron: true,
  getBookmarks: () => ipcRenderer.invoke("trove:getBookmarks"),
  checkLinks: (ids) => ipcRenderer.invoke("trove:checkLinks", ids),
  // Browser-extension helper server controls (desktop app only).
  helper: {
    status: () => ipcRenderer.invoke("trove:helperStatus"),
    start: () => ipcRenderer.invoke("trove:helperStart"),
    stop: () => ipcRenderer.invoke("trove:helperStop"),
    setAutoStop: (v) => ipcRenderer.invoke("trove:helperSetAutoStop", v),
  },
});
