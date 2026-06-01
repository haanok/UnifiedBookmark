// firefox.js — reads bookmarks from Firefox's places.sqlite.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { firefoxPlacesFile } from "./paths.js";
import { domainOf } from "../unify.js";

// Firefox `dateAdded` is microseconds since the unix epoch.
function ffTimeToMs(value) {
  if (!value) return null;
  return Math.round(Number(value) / 1000);
}

export function readFirefox() {
  const places = firefoxPlacesFile();
  if (!places) return { bookmarks: [], notices: [] };

  // places.sqlite is locked (WAL) while Firefox is running, so copy it (plus any
  // -wal/-shm sidecars) to a temp location and open the copy read-only.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trove-ff-"));
  const tmpDb = path.join(tmpDir, "places.sqlite");
  try {
    fs.copyFileSync(places, tmpDb);
    for (const ext of ["-wal", "-shm"]) {
      if (fs.existsSync(places + ext)) fs.copyFileSync(places + ext, tmpDb + ext);
    }
  } catch (err) {
    cleanup(tmpDir);
    return {
      bookmarks: [],
      notices: [{ browser: "firefox", level: "error", message: `Could not access places.sqlite: ${err.code || err.message}` }],
    };
  }

  let rows;
  try {
    const db = new DatabaseSync(tmpDb, { readOnly: true });
    // type 1 = bookmark, type 2 = folder. Join to moz_places for the URL and to the
    // parent row for the folder label.
    rows = db
      .prepare(
        `SELECT b.title       AS title,
                p.url         AS url,
                b.dateAdded   AS dateAdded,
                p.visit_count AS visits,
                parent.title  AS folder
           FROM moz_bookmarks b
           JOIN moz_places p     ON b.fk = p.id
      LEFT JOIN moz_bookmarks parent ON b.parent = parent.id
          WHERE b.type = 1
            AND p.url LIKE 'http%'`
      )
      .all();
    db.close();
  } catch (err) {
    cleanup(tmpDir);
    return {
      bookmarks: [],
      notices: [{ browser: "firefox", level: "error", message: `Could not read places.sqlite: ${err.message}` }],
    };
  }
  cleanup(tmpDir);

  const bookmarks = rows.map((r) => ({
    title: r.title || r.url,
    url: r.url,
    domain: domainOf(r.url),
    folder: r.folder || "Unsorted",
    dateAdded: ffTimeToMs(r.dateAdded),
    visits: r.visits || 0,
    browser: "firefox",
  }));

  return { bookmarks, notices: [] };
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}
