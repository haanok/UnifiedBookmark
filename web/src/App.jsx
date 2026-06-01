import { useState } from "react";
import { useTrove } from "./hooks/useTrove.js";
import CondensedView from "./views/CondensedView.jsx";
import FullDashboard from "./FullDashboard.jsx";
import Toast from "./views/Toast.jsx";
import "./condensed.css";

// App — root that loads bookmark data once and switches between the condensed
// "glance" view (default) and the full dashboard.
export default function App() {
  const trove = useTrove();
  const [mode, setMode] = useState("condensed"); // condensed | full

  if (trove.loadError) {
    const inApp = typeof window !== "undefined" && window.trove?.isElectron;
    const inExt = !inApp && typeof chrome !== "undefined" && chrome.runtime?.id;
    return (
      <div className="screen">
        <div className="screen-title">Couldn't read your bookmarks</div>
        <div className="screen-body">
          {trove.loadError}.{" "}
          {inApp ? (
            "Try reopening Trove."
          ) : inExt ? (
            <>Open the Trove desktop app (<span className="mono">npm run app</span>) or run <span className="mono">npm run dev:server</span> so the extension can sync, then reopen this tab.</>
          ) : (
            <>Make sure the local server is running (<span className="mono">npm run dev:server</span>), then reload.</>
          )}
        </div>
      </div>
    );
  }
  if (!trove.data) {
    return (
      <div className="screen">
        <div className="spinner" />
        <div className="screen-title">Reading your bookmarks…</div>
        <div className="screen-body">Scanning Chrome, Firefox, Edge &amp; Safari bookmark stores.</div>
      </div>
    );
  }

  return (
    <>
      {mode === "condensed" ? (
        <CondensedView trove={trove} onShowFull={() => setMode("full")} />
      ) : (
        <FullDashboard trove={trove} onExit={() => setMode("condensed")} />
      )}
      <Toast toast={trove.toast} />
    </>
  );
}
