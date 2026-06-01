// BrowserDot — a colored dot, or a labeled pill, for a bookmark's source browser.
// `browsers` is the map from the loaded data ({ chrome: {name,color}, ... }).
export default function BrowserDot({ browser, browsers, label = false }) {
  const b = browsers[browser];
  if (!b) return null;
  if (label) {
    return (
      <span className="browser-pill" style={{ "--bc": b.color }}>
        <span className="browser-pill-dot" />
        {b.name}
      </span>
    );
  }
  return <span className="browser-dot" style={{ background: b.color }} title={b.name} />;
}
