// format.js — display helpers ported from the design's components.jsx.

export function rootDomain(d) {
  return (d || "").replace(/^www\./, "");
}

export function faviconHue(domain) {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function relativeDate(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return d + "d ago";
  if (d < 365) return Math.floor(d / 30) + "mo ago";
  const y = Math.floor(d / 365);
  return y + "y ago";
}

export function exactDate(ts) {
  if (!ts) return "unknown date";
  return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// folderColor needs the folder palette from the loaded data; resolved via a setter.
let folderList = [];
export function setFolders(folders) {
  folderList = folders || [];
}
export function folderColor(name) {
  const f = folderList.find((x) => x.name === name);
  return f ? f.color : "#888";
}
