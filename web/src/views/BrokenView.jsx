import Favicon from "../components/Favicon.jsx";
import BrowserDot from "../components/BrowserDot.jsx";
import EmptyState from "./EmptyState.jsx";

// Broken-link triage. Link checks are live (backend), so this also handles the
// scanning / not-yet-scanned states the prototype didn't need.
export default function BrokenView({ items, browsers, checking, checked, lastChecked, onRemove, onRecheck, onOpen }) {
  if (checking && !items.length) {
    return (
      <div className="screen" style={{ height: "auto", padding: "70px 20px" }}>
        <div className="spinner" />
        <div className="screen-title">Checking links…</div>
        <div className="screen-body">Probing every bookmarked URL for reachability. This can take a moment.</div>
      </div>
    );
  }
  if (checked && !items.length) {
    return <EmptyState icon="✓" title="All links healthy" body="No broken bookmarks detected in the last scan." />;
  }
  if (!items.length) {
    return (
      <div className="broken-list">
        <div className="broken-banner">
          <span className="broken-banner-ico">⚠</span>
          <div>Links haven't been checked yet this session.</div>
          <button className="btn-ghost" onClick={() => onRecheck()}>Check all links</button>
        </div>
      </div>
    );
  }
  return (
    <div className="broken-list">
      <div className="broken-banner">
        <span className="broken-banner-ico">⚠</span>
        <div>
          <strong>{items.length} unreachable {items.length === 1 ? "link" : "links"}</strong>
          {lastChecked && <> — last checked {lastChecked}.</>}
        </div>
        <button className="btn-ghost" disabled={checking} onClick={() => onRecheck()}>
          {checking ? "Checking…" : "Re-check all"}
        </button>
      </div>
      {items.map((bm) => (
        <div className="broken-row" key={bm.id}>
          <Favicon domain={bm.domain} size={32} />
          <div className="broken-main">
            <div className="broken-title" onClick={() => onOpen(bm)}>{bm.title}</div>
            <div className="broken-url mono">{bm.url}</div>
          </div>
          <span className="status-code">{bm.error}</span>
          <BrowserDot browser={bm.browser} browsers={browsers} label />
          <div className="broken-actions">
            <button className="btn-ghost sm" disabled={checking} onClick={() => onRecheck([bm.id])}>Re-check</button>
            <button className="btn-ghost sm danger" onClick={() => onRemove(bm)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
