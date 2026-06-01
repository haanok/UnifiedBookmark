import { useMemo, useRef, useState, useEffect } from "react";

const isElectron = typeof window !== "undefined" && window.trove?.isElectron;

// User-defined services (your own IP/DNS), persisted per browser/app in localStorage.
function CustomServices() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trove:services") || "[]");
    } catch {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");

  const persist = (next) => {
    setItems(next);
    try {
      localStorage.setItem("trove:services", JSON.stringify(next));
    } catch {
      /* private mode / quota — non-fatal */
    }
  };
  const add = (e) => {
    e.preventDefault();
    const a = addr.trim();
    if (!a) return;
    persist([...items, { id: Date.now(), name: name.trim() || a, url: a }]);
    setName("");
    setAddr("");
  };
  const remove = (id) => persist(items.filter((x) => x.id !== id));
  const open = (url) => {
    const u = /^https?:\/\//i.test(url) ? url : `http://${url}`; // bare IPs/hosts default to http
    window.open(u, "_blank", "noopener");
  };

  return (
    <div className="custom-svc">
      <div className="custom-svc-label">YOUR SERVICES</div>
      {items.map((s) => (
        <div className="csvc" key={s.id}>
          <button className="csvc-open" onClick={() => open(s.url)} title={s.url}>
            <span className="csvc-name">{s.name}</span>
            <span className="csvc-host">{s.url}</span>
          </button>
          <button className="csvc-del" onClick={() => remove(s.id)} title="Remove">×</button>
        </div>
      ))}
      <form className="csvc-add" onSubmit={add}>
        <input className="csvc-in" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="csvc-in" placeholder="IP or address — e.g. 192.168.1.10:8080" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <button className="csvc-btn" type="submit">Add service</button>
      </form>
    </div>
  );
}

// Desktop-app-only control for the browser-extension helper server: shows whether it's
// running, lets you start/stop it, and choose whether it auto-stops after the browser syncs.
function HelperControl() {
  const [s, setS] = useState(null);
  const refresh = () => window.trove.helper.status().then(setS);
  useEffect(() => {
    refresh();
  }, []);
  if (!s) return null;
  return (
    <div className="helper">
      <div className="helper-row">
        <span className={`helper-dot ${s.running ? "on" : ""}`} />
        <span className="helper-label">
          Extension helper {s.running ? <>· <span className="mono">127.0.0.1:{s.port}</span></> : "· stopped"}
        </span>
        <button
          className="helper-btn"
          onClick={() => (s.running ? window.trove.helper.stop() : window.trove.helper.start()).then(setS)}
        >
          {s.running ? "Stop" : "Start"}
        </button>
      </div>
      <label className="helper-opt">
        <input
          type="checkbox"
          checked={s.autoStop}
          onChange={(e) => window.trove.helper.setAutoStop(e.target.checked).then(setS)}
        />
        Stop automatically after the browser syncs
      </label>
    </div>
  );
}

// Clean a domain into a short brand name (ported from the condensed prototype).
const NAME_MAP = {
  ycombinator: "Hacker News", mozilla: "MDN", kingarthurbaking: "King Arthur",
  "1password": "1Password", devdocs: "DevDocs", css: "CSS-Tricks",
};
function brandName(domain) {
  const parts = (domain || "").replace(/^www\./, "").split(".");
  const core = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  if (NAME_MAP[core]) return NAME_MAP[core];
  return core ? core.charAt(0).toUpperCase() + core.slice(1) : domain;
}

// CondensedView — the Glance-style single-screen dashboard. Services are tucked into
// a hover menu (top-left); the full dashboard opens from a button in the opposite corner.
export default function CondensedView({ trove, onShowFull }) {
  const { data, bookmarks, refresh, refreshing } = trove;
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // Phosphor CRT scanlines — toggleable, persisted, default on.
  const [scan, setScan] = useState(() => {
    try {
      return (localStorage.getItem("trove:scanlines") ?? "1") === "1";
    } catch {
      return true;
    }
  });
  const toggleScan = () => {
    setScan((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("trove:scanlines", next ? "1" : "0");
      } catch {
        /* private mode / quota — non-fatal */
      }
      return next;
    });
  };

  // The search bar is a web search (not a bookmark filter): Enter searches the web,
  // or navigates straight to a typed URL/host. Opens in a new tab (the desktop app
  // routes window.open to the system browser).
  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const isUrl = /^https?:\/\//i.test(q);
    const looksLikeHost = !q.includes(" ") && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q);
    const target = isUrl
      ? q
      : looksLikeHost
      ? `https://${q}`
      : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.open(target, "_blank", "noopener");
    setQuery("");
  };

  // Top folders → columns of top deduped links (by visits), mirroring the prototype.
  const columns = useMemo(() => {
    const top = data.folders.slice().sort((a, b) => b.count - a.count).slice(0, 6);
    return top.map((f) => {
      const seen = new Set();
      const links = bookmarks
        .filter((x) => x.folder === f.name)
        .sort((a, b) => b.visits - a.visits)
        .filter((x) => {
          const n = brandName(x.domain);
          if (seen.has(n)) return false;
          seen.add(n);
          return true;
        })
        .slice(0, 6)
        .map((x) => ({ id: x.id, name: brandName(x.domain), url: x.url, domain: x.domain, folder: f.name, raw: x }));
      return { name: f.name, links };
    });
  }, [data.folders, bookmarks]);

  // Glance-style "s" to focus search, Esc to clear.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "s" && document.activeElement !== inputRef.current && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Browser status line for the services menu.
  const statusFor = (id) => {
    const b = data.browsers[id];
    const notice = data.notices.find((n) => n.browser === id);
    if (b.count > 0) return { ok: true, text: `${b.count.toLocaleString("en-US")} saved` };
    if (notice && notice.level === "permission") return { ok: false, text: "needs access" };
    return { ok: false, text: "not connected" };
  };

  return (
    <div className={`glance${scan ? " scan" : ""}`}>
      {/* hidden services menu — top-left, reveals on hover/focus */}
      <div className="glance-menu svc-menu" tabIndex={0}>
        <button className="glance-icon" aria-label="Services" title="Services">⧉</button>
        <div className="svc-flyout panel">
          <div className="sec-label">SERVICES</div>
          <div className="services">
            {data.browserOrder.map((id) => {
              const b = data.browsers[id];
              const s = statusFor(id);
              return (
                <div className="svc" key={id} style={{ "--bc": b.color }}>
                  <div className="svc-tile">{b.name[0]}</div>
                  <div className="svc-body">
                    <div className="svc-name">{b.name}</div>
                    <div className="svc-status">
                      {s.ok ? <span className="ok">OK</span> : <span className="off">{s.text === "needs access" ? "⚠" : "—"}</span>}
                      {s.ok ? <> · {s.text}</> : <> {s.text}</>}
                    </div>
                  </div>
                  {s.ok && <div className="svc-check">✓</div>}
                </div>
              );
            })}
          </div>
          <CustomServices />
          {isElectron && <HelperControl />}
        </div>
      </div>

      {/* top-right actions: scanlines toggle + sync (re-scan) + open the full dashboard */}
      <div className="glance-actions">
        <button
          className={`glance-pill${scan ? " on" : ""}`}
          onClick={toggleScan}
          title="Toggle CRT scanlines"
          aria-pressed={scan}
        >
          <span className="glance-pill-ico">▤</span>
          <span className="glance-pill-label">Scanlines</span>
          <span className="glance-switch" />
        </button>
        <button className="glance-pill" onClick={refresh} disabled={refreshing} title="Re-scan bookmarks">
          <span className={`glance-pill-ico ${refreshing ? "spin" : ""}`}>⟳</span>
          <span className="glance-pill-label">{refreshing ? "Syncing…" : "Sync"}</span>
        </button>
        <button className="glance-pill" onClick={onShowFull} title="Open full dashboard">
          <span className="glance-pill-ico">☰</span>
          <span className="glance-pill-label">Full list</span>
        </button>
      </div>

      <div className="wrap">
        <section>
          <div className="sec-label">SEARCH</div>
          <form className="search" onSubmit={onSearch}>
            <span className="search-ico">⌕</span>
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search the web…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="kbd">s</span>
          </form>
        </section>

        <section>
          <div className="sec-label">BOOKMARKS</div>
          <div className="panel">
            {columns.length ? (
              <div className="bookmarks">
                {columns.map((col) => (
                  <div className="bm-col" key={col.name}>
                    <div className="bm-head">{col.name}</div>
                    <div className="bm-links">
                      {col.links.map((l) => (
                        <a className="bm-link" key={l.id} href={l.url} target="_blank" rel="noopener">
                          {l.name}
                          <span className="bm-arrow">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bookmarks">
                <div className="bm-empty">No bookmarks yet.</div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="foot"><b>Trove</b> (dev)</div>
    </div>
  );
}
