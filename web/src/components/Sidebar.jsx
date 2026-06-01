// Sidebar — smart views, per-browser sources, and folder filters (ported from the design).
export default function Sidebar({
  view, setView, source, setSource, folder, setFolder,
  data, stats, lastSync,
}) {
  const { browsers, browserOrder, folders } = data;
  const smart = [
    { id: "all", label: "All bookmarks", icon: "▦", count: stats.total },
    { id: "recent", label: "Recently added", icon: "◷", count: null },
    { id: "duplicates", label: "Duplicates", icon: "⧉", count: stats.duplicates, badge: "warn" },
    { id: "broken", label: "Broken links", icon: "⚠", count: stats.broken || null, badge: "danger" },
  ];
  const activeBrowsers = browserOrder.filter((id) => browsers[id].count > 0).length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">◆</div>
        <div className="brand-name">Trove</div>
        <div className="brand-sub">unified bookmarks</div>
      </div>

      <div className="side-section">
        <div className="side-label">Library</div>
        {smart.map((s) => (
          <button
            key={s.id}
            className={`side-item ${view === s.id && !source && !folder ? "active" : ""}`}
            onClick={() => { setView(s.id); setSource(null); setFolder(null); }}
          >
            <span className="side-ico">{s.icon}</span>
            <span className="side-text">{s.label}</span>
            {s.count != null && <span className={`side-count ${s.badge || ""}`}>{s.count}</span>}
          </button>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">Sources</div>
        {browserOrder.map((id) => {
          const b = browsers[id];
          return (
            <button
              key={id}
              className={`side-item ${source === id ? "active" : ""}`}
              onClick={() => { setSource(source === id ? null : id); setFolder(null); setView("all"); }}
            >
              <span className="side-swatch" style={{ background: b.color }} />
              <span className="side-text">{b.name}</span>
              <span className="side-count mono">{b.libCount}</span>
            </button>
          );
        })}
      </div>

      <div className="side-section">
        <div className="side-label">Folders</div>
        {folders.map((f) => (
          <button
            key={f.name}
            className={`side-item ${folder === f.name ? "active" : ""}`}
            onClick={() => { setFolder(folder === f.name ? null : f.name); setSource(null); setView("all"); }}
          >
            <span className="side-swatch sq" style={{ background: f.color }} />
            <span className="side-text">{f.name}</span>
            <span className="side-count mono">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="side-foot">
        <div className="sync-row">
          <span className="sync-dot" />
          <span>{lastSync}</span>
        </div>
        <div className="sync-sub mono">{stats.total} across {activeBrowsers} {activeBrowsers === 1 ? "browser" : "browsers"}</div>
      </div>
    </aside>
  );
}
