// build-extension.mjs — assemble the loadable browser extension.
// Copies the built web UI (web/dist) into extension/app/ so manifest.json's
// chrome_url_overrides.newtab ("app/index.html") resolves. Run after `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "web", "dist");
const out = path.join(root, "extension", "app");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("web/dist not found — run `npm run build` first.");
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(dist, out, { recursive: true });

console.log(`Extension assembled → ${path.relative(root, out)}`);
console.log("Load it unpacked:");
console.log("  Chrome/Edge: chrome://extensions → Developer mode → Load unpacked → select the 'extension' folder");
console.log("  Firefox:     about:debugging → This Firefox → Load Temporary Add-on → pick extension/manifest.json");
