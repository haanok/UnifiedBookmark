// linkChecker.js — live HTTP reachability checks with an in-memory result cache.

const cache = new Map(); // url -> { status: "ok"|"broken", error: string|null, checkedAt: number }
const CACHE_TTL_MS = 30 * 60 * 1000; // re-check a URL at most every 30 min
const TIMEOUT_MS = 8000;
const CONCURRENCY = 10;

// Reason phrases for common codes (HEAD responses often omit statusText).
const STATUS_TEXT = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  408: "Request Timeout",
  410: "Gone",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

// Map a fetch/network failure to the design's broken-link vocabulary.
function classifyError(err) {
  const code = err && err.cause && err.cause.code;
  if (err && err.name === "AbortError") return "Connection timed out";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "DNS lookup failed";
  if (code === "ECONNREFUSED") return "Connection refused";
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") return "Connection timed out";
  if (typeof code === "string" && code.startsWith("ERR_TLS")) return "SSL handshake failed";
  if (typeof code === "string" && code.includes("CERT")) return "SSL handshake failed";
  return "Unreachable";
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const opts = { redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Trove-LinkCheck/0.1" } };
  try {
    let res = await fetch(url, { ...opts, method: "HEAD" });
    // Some servers reject HEAD — retry with GET.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { ...opts, method: "GET" });
    }
    if (res.status >= 400) {
      const reason = res.statusText || STATUS_TEXT[res.status] || "Error";
      return { status: "broken", error: `${res.status} ${reason}` };
    }
    return { status: "ok", error: null };
  } catch (err) {
    return { status: "broken", error: classifyError(err) };
  } finally {
    clearTimeout(timer);
  }
}

function cached(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.checkedAt < CACHE_TTL_MS) return hit;
  return null;
}

// Run a simple concurrency-limited pool over the given items.
async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

// Check a list of { id, url } targets. Returns { results: { [id]: { status, error } } }.
export async function checkLinks(targets) {
  const results = {};
  await pool(targets, async ({ id, url }) => {
    let outcome = cached(url);
    if (!outcome) {
      outcome = { ...(await probe(url)), checkedAt: Date.now() };
      cache.set(url, outcome);
    }
    results[id] = { status: outcome.status, error: outcome.error };
  });
  return { results, checkedAt: Date.now() };
}
