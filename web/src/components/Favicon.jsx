import { faviconHue, rootDomain } from "../lib/format.js";

// Generated gradient tile with the domain's first letter (ported from the design).
export default function Favicon({ domain, size = 38 }) {
  const hue = faviconHue(domain);
  const letter = (rootDomain(domain)[0] || "?").toUpperCase();
  return (
    <div
      className="favicon"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: `linear-gradient(150deg, oklch(0.58 0.16 ${hue}), oklch(0.46 0.15 ${(hue + 28) % 360}))`,
        fontSize: size * 0.42,
      }}
    >
      {letter}
    </div>
  );
}
