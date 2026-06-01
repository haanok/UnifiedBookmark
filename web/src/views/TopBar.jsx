// TopBar — title, search, sort, and the grouped/grid/list layout switcher.
export default function TopBar({ query, setQuery, sort, setSort, layout, setLayout, title, subtitle, count, note }) {
  const sorts = [
    { id: "recent", label: "Recently added" },
    { id: "oldest", label: "Oldest first" },
    { id: "title", label: "Title A–Z" },
    { id: "visits", label: "Most visited" },
    { id: "domain", label: "By domain" },
  ];
  const layouts = [
    { id: "grouped", label: "Grouped", icon: "▤" },
    { id: "grid", label: "Grid", icon: "▦" },
    { id: "list", label: "List", icon: "≣" },
  ];
  return (
    <header className="topbar">
      <div className="topbar-titles">
        <h1 className="page-title">{title}</h1>
        <div className="page-sub">
          {subtitle}
          {count != null && <span className="page-count mono"> · {count} shown</span>}
        </div>
        {note && <div className="alpha-note">{note}</div>}
      </div>
      <div className="topbar-controls">
        <div className="search">
          <span className="search-ico">⌕</span>
          <input
            className="search-input"
            placeholder="Search titles, domains, folders…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && <button className="search-clear" onClick={() => setQuery("")}>✕</button>}
        </div>
        <div className="select-wrap">
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="segmented">
          {layouts.map((l) => (
            <button
              key={l.id}
              className={`seg ${layout === l.id ? "active" : ""}`}
              onClick={() => setLayout(l.id)}
              title={l.label}
            >
              <span className="seg-ico">{l.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
