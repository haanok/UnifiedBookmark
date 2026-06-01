import { useState, useMemo, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import BookmarkCard from "./components/BookmarkCard.jsx";
import BookmarkRow from "./components/BookmarkRow.jsx";
import TopBar from "./views/TopBar.jsx";
import DuplicatesView from "./views/DuplicatesView.jsx";
import BrokenView from "./views/BrokenView.jsx";
import EmptyState from "./views/EmptyState.jsx";
import Toast from "./views/Toast.jsx";
import { fetchBookmarks, checkLinks } from "./api.js";
import { rootDomain, setFolders } from "./lib/format.js";

export default function App() {
  const [data, setData] = useState(null); // { browsers, browserOrder, folders, stats, notices }
  const [bookmarks, setBookmarks] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [view, setView] = useState("all"); // all | recent | duplicates | broken
  const [source, setSource] = useState(null);
  const [folder, setFolder] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [layout, setLayout] = useState("grouped");
  const [toast, setToast] = useState(null);

  const [linkCheck, setLinkCheck] = useState({ checking: false, checked: false, lastChecked: null });

  const flash = useCallback((msg, icon) => {
    const id = Date.now();
    setToast({ id, msg, icon });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600);
  }, []);

  /* ----- load real bookmarks from the backend ----- */
  useEffect(() => {
    let cancelled = false;
    fetchBookmarks()
      .then((d) => {
        if (cancelled) return;
        setFolders(d.folders);
        setData(d);
        setBookmarks(d.bookmarks);
      })
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => { cancelled = true; };
  }, []);

  /* ----- live link checking ----- */
  const runCheck = useCallback(async (ids) => {
    setLinkCheck((s) => ({ ...s, checking: true }));
    flash(ids ? "Re-checking link…" : "Checking all links…", "↻");
    try {
      const { results } = await checkLinks(ids);
      setBookmarks((prev) =>
        prev.map((b) => (results[b.id] ? { ...b, status: results[b.id].status, error: results[b.id].error } : b))
      );
      const when = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setLinkCheck({ checking: false, checked: true, lastChecked: `today at ${when}` });
    } catch (err) {
      setLinkCheck((s) => ({ ...s, checking: false }));
      flash(`Link check failed: ${err.message}`, "⚠");
    }
  }, [flash]);

  // Auto-run a check the first time the Broken view is opened.
  useEffect(() => {
    if (view === "broken" && !linkCheck.checked && !linkCheck.checking) runCheck();
  }, [view, linkCheck.checked, linkCheck.checking, runCheck]);

  /* ----- actions (read-only alpha: local state only) ----- */
  const onOpen = useCallback((bm) => {
    window.open(bm.url, "_blank", "noopener");
    flash(`Opening ${rootDomain(bm.domain)}`, "↗");
  }, [flash]);

  const onRemove = useCallback((bm) => {
    setBookmarks((prev) => prev.filter((x) => x.id !== bm.id));
    flash(`Hid “${bm.title.slice(0, 32)}${bm.title.length > 32 ? "…" : ""}”`, "✕");
  }, [flash]);

  const onMerge = useCallback((group) => {
    const keep = group.keepId;
    setBookmarks((prev) =>
      prev
        .filter((x) => x.dupeGroup !== group.key || x.id === keep)
        .map((x) => (x.id === keep ? { ...x, dupeGroup: null } : x))
    );
    flash(`Merged ${group.items.length} copies into one`, "⧉");
  }, [flash]);

  /* ----- derived stats ----- */
  const stats = useMemo(() => {
    if (!data) return { total: 0, duplicates: 0, broken: 0 };
    const duplicates = bookmarks.filter((b) => b.dupeGroup).length;
    const broken = bookmarks.filter((b) => b.status === "broken").length;
    return { ...data.stats, total: bookmarks.length, duplicates, broken };
  }, [bookmarks, data]);

  /* ----- filtering + sorting ----- */
  const filtered = useMemo(() => {
    let list = bookmarks.slice();
    if (source) list = list.filter((b) => b.browser === source);
    if (folder) list = list.filter((b) => b.folder === folder);
    if (view === "broken") list = list.filter((b) => b.status === "broken");
    if (view === "duplicates") list = list.filter((b) => b.dupeGroup);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.domain.toLowerCase().includes(q) ||
          b.folder.toLowerCase().includes(q)
      );
    }
    const cmp = {
      recent: (a, b) => b.dateAdded - a.dateAdded,
      oldest: (a, b) => a.dateAdded - b.dateAdded,
      title: (a, b) => a.title.localeCompare(b.title),
      visits: (a, b) => b.visits - a.visits,
      domain: (a, b) => rootDomain(a.domain).localeCompare(rootDomain(b.domain)),
    }[view === "recent" ? "recent" : sort];
    list.sort(cmp);
    if (view === "recent") list = list.slice(0, 24);
    return list;
  }, [bookmarks, source, folder, view, query, sort]);

  const dupeGroups = useMemo(() => {
    const map = {};
    bookmarks.forEach((b) => {
      if (b.dupeGroup) (map[b.dupeGroup] = map[b.dupeGroup] || []).push(b);
    });
    return Object.entries(map)
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => {
        const sorted = items.slice().sort((a, b) => b.dateAdded - a.dateAdded);
        return { key, items: sorted, keepId: sorted[0].id };
      });
  }, [bookmarks]);

  const brokenItems = useMemo(
    () => bookmarks.filter((b) => b.status === "broken").sort((a, b) => b.dateAdded - a.dateAdded),
    [bookmarks]
  );

  /* ----- loading / error screens ----- */
  if (loadError) {
    return (
      <div className="screen">
        <div className="screen-title">Can't reach the Trove backend</div>
        <div className="screen-body">
          {loadError}. Make sure the local server is running (<span className="mono">npm run dev:server</span>), then reload.
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="screen">
        <div className="spinner" />
        <div className="screen-title">Reading your bookmarks…</div>
        <div className="screen-body">Scanning Chrome, Firefox, Edge & Safari bookmark stores.</div>
      </div>
    );
  }

  /* ----- titles ----- */
  const titleInfo = () => {
    if (view === "duplicates") return ["Duplicates", "The same page saved in more than one browser"];
    if (view === "broken") return ["Broken links", "Bookmarks that no longer resolve"];
    if (view === "recent") return ["Recently added", "Your newest saves across every browser"];
    if (source) return [data.browsers[source].name, "Bookmarks imported from this browser"];
    if (folder) return [folder, "Bookmarks tagged in this folder"];
    const active = data.browserOrder.filter((id) => data.browsers[id].count > 0).map((id) => data.browsers[id].name);
    return ["All bookmarks", `Everything, unified from ${active.join(", ") || "your browsers"}`];
  };
  const [pTitle, pSub] = titleInfo();

  const renderBody = () => {
    if (view === "duplicates") return <DuplicatesView groups={dupeGroups} browsers={data.browsers} onMerge={onMerge} onOpen={onOpen} />;
    if (view === "broken")
      return (
        <BrokenView
          items={brokenItems}
          browsers={data.browsers}
          checking={linkCheck.checking}
          checked={linkCheck.checked}
          lastChecked={linkCheck.lastChecked}
          onRemove={onRemove}
          onRecheck={runCheck}
          onOpen={onOpen}
        />
      );
    if (!filtered.length) {
      return <EmptyState icon="⌕" title="No matches" body={query ? `Nothing matches “${query}”.` : "No bookmarks here yet."} />;
    }
    if (layout === "list") {
      return (
        <div className="rows">
          {filtered.map((bm) => <BookmarkRow key={bm.id} bm={bm} browsers={data.browsers} onOpen={onOpen} onRemove={onRemove} />)}
        </div>
      );
    }
    if (layout === "grouped" && !source) {
      return data.browserOrder.map((bid) => {
        const items = filtered.filter((b) => b.browser === bid);
        if (!items.length) return null;
        const b = data.browsers[bid];
        return (
          <section className="group" key={bid}>
            <div className="group-head" style={{ "--gc": b.color }}>
              <span className="group-bar" />
              <span className="group-name">{b.name}</span>
              <span className="group-count mono">{items.length}</span>
            </div>
            <div className="grid dens-regular">
              {items.map((bm) => <BookmarkCard key={bm.id} bm={bm} browsers={data.browsers} onOpen={onOpen} onRemove={onRemove} density="regular" />)}
            </div>
          </section>
        );
      });
    }
    return (
      <div className="grid dens-regular">
        {filtered.map((bm) => <BookmarkCard key={bm.id} bm={bm} browsers={data.browsers} onOpen={onOpen} onRemove={onRemove} density="regular" />)}
      </div>
    );
  };

  const bodyCount = view === "duplicates" || view === "broken" ? null : filtered.length;
  const permissionNotices = data.notices.filter((n) => n.level === "permission");
  const errorNotices = data.notices.filter((n) => n.level === "error");

  return (
    <div className="app">
      <Sidebar
        view={view} setView={setView}
        source={source} setSource={setSource}
        folder={folder} setFolder={setFolder}
        data={data} stats={stats}
        lastSync="Read just now"
      />
      <main className="main">
        <TopBar
          query={query} setQuery={setQuery}
          sort={sort} setSort={setSort}
          layout={layout} setLayout={setLayout}
          title={pTitle} subtitle={pSub} count={bodyCount}
          note="Read-only alpha — merge & hide affect this view only, not your real bookmark files."
        />
        <div className="content">
          {permissionNotices.map((n, i) => (
            <div className="notice-bar permission" key={`p${i}`}>
              <span className="notice-bar-ico">🔒</span>
              <div>{n.message}</div>
            </div>
          ))}
          {errorNotices.map((n, i) => (
            <div className="notice-bar" key={`e${i}`}>
              <span className="notice-bar-ico">⚠</span>
              <div><strong>{data.browsers[n.browser]?.name || n.browser}:</strong> {n.message}</div>
            </div>
          ))}
          {renderBody()}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
