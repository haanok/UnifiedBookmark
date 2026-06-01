import Favicon from "./Favicon.jsx";
import BrowserDot from "./BrowserDot.jsx";
import { rootDomain, relativeDate, folderColor } from "../lib/format.js";

// Grid card for a single bookmark (ported from the design's BookmarkCard).
export default function BookmarkCard({ bm, browsers, onOpen, onRemove, density }) {
  const broken = bm.status === "broken";
  return (
    <div className={`card ${broken ? "is-broken" : ""} dens-${density}`} onClick={() => onOpen(bm)}>
      <div className="card-top">
        <Favicon domain={bm.domain} size={density === "compact" ? 30 : 38} />
        <div className="card-head">
          <div className="card-title" title={bm.title}>{bm.title}</div>
          <div className="card-domain">{rootDomain(bm.domain)}</div>
        </div>
        <BrowserDot browser={bm.browser} browsers={browsers} />
      </div>
      <div className="card-meta">
        <span className="folder-chip" style={{ "--fc": folderColor(bm.folder) }}>
          <span className="folder-chip-dot" />{bm.folder}
        </span>
        {bm.dupeGroup && <span className="tag tag-dupe">duplicate</span>}
        {broken && <span className="tag tag-broken">{bm.error}</span>}
        <span className="card-date">{relativeDate(bm.dateAdded)}</span>
      </div>
      <div className="card-actions">
        <button className="icon-btn" title="Open" onClick={(e) => { e.stopPropagation(); onOpen(bm); }}>↗</button>
        <button className="icon-btn danger" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(bm); }}>✕</button>
      </div>
    </div>
  );
}
