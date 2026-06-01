import Favicon from "./Favicon.jsx";
import BrowserDot from "./BrowserDot.jsx";
import { rootDomain, relativeDate, folderColor } from "../lib/format.js";

// Compact list row for a single bookmark (ported from the design's BookmarkRow).
export default function BookmarkRow({ bm, browsers, onOpen, onRemove }) {
  const broken = bm.status === "broken";
  return (
    <div className={`row ${broken ? "is-broken" : ""}`} onClick={() => onOpen(bm)}>
      <Favicon domain={bm.domain} size={26} />
      <div className="row-title" title={bm.title}>{bm.title}</div>
      <div className="row-domain">{rootDomain(bm.domain)}</div>
      <span className="folder-chip sm" style={{ "--fc": folderColor(bm.folder) }}>
        <span className="folder-chip-dot" />{bm.folder}
      </span>
      <div className="row-flags">
        {bm.dupeGroup && <span className="tag tag-dupe">dup</span>}
        {broken && <span className="tag tag-broken">{bm.error}</span>}
      </div>
      <BrowserDot browser={bm.browser} browsers={browsers} label />
      <div className="row-date">{relativeDate(bm.dateAdded)}</div>
      <div className="row-actions">
        <button className="icon-btn" title="Open" onClick={(e) => { e.stopPropagation(); onOpen(bm); }}>↗</button>
        <button className="icon-btn danger" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(bm); }}>✕</button>
      </div>
    </div>
  );
}
