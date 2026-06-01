import { useState, useEffect, useCallback } from "react";
import { fetchBookmarks, checkLinks } from "../api.js";
import { rootDomain, setFolders } from "../lib/format.js";

// useTrove — loads bookmark data once and owns the shared state both the condensed
// and full views build on: the bookmark list, mutations, link checking, and toasts.
export function useTrove() {
  const [data, setData] = useState(null); // { browsers, browserOrder, folders, stats, notices }
  const [bookmarks, setBookmarks] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [linkCheck, setLinkCheck] = useState({ checking: false, checked: false, lastChecked: null });

  const flash = useCallback((msg, icon) => {
    const id = Date.now();
    setToast({ id, msg, icon });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600);
  }, []);

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

  // Read-only alpha: actions affect this view only, never the real bookmark files.
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

  return {
    data, bookmarks, setBookmarks, loadError,
    toast, flash,
    linkCheck, runCheck,
    onOpen, onRemove, onMerge,
  };
}
