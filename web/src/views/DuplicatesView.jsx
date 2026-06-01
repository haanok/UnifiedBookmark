import Favicon from "../components/Favicon.jsx";
import BrowserDot from "../components/BrowserDot.jsx";
import EmptyState from "./EmptyState.jsx";
import { exactDate, folderColor } from "../lib/format.js";

// Duplicate-merge view: each set of same-URL bookmarks with a "keep newest" merge action.
export default function DuplicatesView({ groups, browsers, onMerge, onOpen }) {
  if (!groups.length) {
    return <EmptyState icon="✓" title="No duplicates" body="Every bookmark in your library is unique." />;
  }
  return (
    <div className="dupe-list">
      <div className="dupe-banner">
        <span className="dupe-banner-ico">⧉</span>
        <div>
          <strong>{groups.length} duplicate {groups.length === 1 ? "set" : "sets"}</strong> found across your browsers.
          Merging keeps one copy and removes the rest.
        </div>
      </div>
      {groups.map((g) => (
        <div className="dupe-group" key={g.key}>
          <div className="dupe-group-head">
            <Favicon domain={g.items[0].domain} size={34} />
            <div className="dupe-group-info">
              <div className="dupe-group-title">{g.items[0].title}</div>
              <div className="dupe-group-url mono">{g.items[0].url}</div>
            </div>
            <div className="dupe-group-count">{g.items.length} copies</div>
            <button className="btn-merge" onClick={() => onMerge(g)}>Merge → keep newest</button>
          </div>
          <div className="dupe-copies">
            {g.items.map((it) => (
              <div className="dupe-copy" key={it.id} onClick={() => onOpen(it)}>
                <BrowserDot browser={it.browser} browsers={browsers} label />
                <span className="folder-chip sm" style={{ "--fc": folderColor(it.folder) }}>
                  <span className="folder-chip-dot" />{it.folder}
                </span>
                <span className="dupe-copy-date mono">added {exactDate(it.dateAdded)}</span>
                {it.id === g.keepId && <span className="tag tag-keep">will keep</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
