/**
 * Local SQLite cache for Storva Agent.
 * Stores: offline sync queue, upload state, reconciliation metadata,
 * and the list of registered storage volumes (multi-storage support).
 */
import Database from 'better-sqlite3'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const DB_PATH = process.env.STORVA_DB_PATH || path.join(process.cwd(), 'data', 'agent.db')

mkdirSync(path.dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH, { fileMustExist: false })

// WAL mode is required once we have more than one process opening this same
// file — the main agent process (HTTP server, uploads) and the standalone
// reconciler process (chokidar watcher, sync-queue writer) each hold their
// own connection. WAL allows concurrent readers + a single writer across
// processes safely instead of the default rollback-journal mode, which can
// throw SQLITE_BUSY under concurrent multi-process access.
db.pragma('journal_mode = WAL')

export { DB_PATH }

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    retries INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    relative_path TEXT NOT NULL,
    total_chunks INTEGER NOT NULL,
    received_chunks INTEGER NOT NULL DEFAULT 0,
    checksum TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS file_cache (
    relative_path TEXT PRIMARY KEY,
    size INTEGER,
    mime_type TEXT,
    checksum TEXT,
    modified_at INTEGER,
    synced INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0
  );

  -- Multi-storage: up to 8 registered volumes.
  -- Seeded on startup from STORVA_STORAGE_PATHS env var.
  -- enabled = 1 means actively watched & browseable.
  CREATE TABLE IF NOT EXISTS storage_volumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`)

// ── Migrations ────────────────────────────────────────────────────────────────

const fileCacheColumns = db.prepare(`PRAGMA table_info(file_cache)`).all() as { name: string }[]
if (!fileCacheColumns.some((c) => c.name === 'is_favorite')) {
  db.exec(`ALTER TABLE file_cache ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`)
}

// ── Sync queue ────────────────────────────────────────────────────────────────
export const syncQueue = {
  push(action: string, payload: object) {
    db.prepare(`INSERT INTO sync_queue (action, payload) VALUES (?, ?)`).run(action, JSON.stringify(payload))
  },
  peek(limit = 10) {
    return db.prepare(`SELECT * FROM sync_queue ORDER BY id ASC LIMIT ?`).all(limit)
  },
  remove(id: number) {
    db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(id)
  },
  incrementRetry(id: number) {
    db.prepare(`UPDATE sync_queue SET retries = retries + 1 WHERE id = ?`).run(id)
  },
}

// ── Upload sessions ───────────────────────────────────────────────────────────
export const uploadSessions = {
  create(id: string, relativePath: string, totalChunks: number, checksum?: string) {
    db.prepare(`INSERT INTO upload_sessions (id, relative_path, total_chunks, checksum) VALUES (?, ?, ?, ?)`)
      .run(id, relativePath, totalChunks, checksum || null)
  },
  get(id: string) {
    return db.prepare(`SELECT * FROM upload_sessions WHERE id = ?`).get(id)
  },
  incrementChunk(id: string) {
    db.prepare(`UPDATE upload_sessions SET received_chunks = received_chunks + 1 WHERE id = ?`).run(id)
  },
  complete(id: string) {
    db.prepare(`UPDATE upload_sessions SET completed = 1 WHERE id = ?`).run(id)
  },
  delete(id: string) {
    db.prepare(`DELETE FROM upload_sessions WHERE id = ?`).run(id)
  },
}

// ── File cache ────────────────────────────────────────────────────────────────
export const fileCache = {
  upsert(relativePath: string, meta: { size: number; mimeType: string; checksum?: string; modifiedAt: number }) {
    db.prepare(`
      INSERT INTO file_cache (relative_path, size, mime_type, checksum, modified_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(relative_path) DO UPDATE SET
        size = excluded.size, mime_type = excluded.mime_type,
        checksum = excluded.checksum, modified_at = excluded.modified_at, synced = 0
    `).run(relativePath, meta.size, meta.mimeType, meta.checksum || null, meta.modifiedAt)
  },
  markSynced(relativePath: string) {
    db.prepare(`UPDATE file_cache SET synced = 1 WHERE relative_path = ?`).run(relativePath)
  },
  getPending() {
    return db.prepare(`SELECT * FROM file_cache WHERE synced = 0`).all()
  },
  remove(relativePath: string) {
    db.prepare(`DELETE FROM file_cache WHERE relative_path = ?`).run(relativePath)
  },
}

export const favorites = {
  toggle(relativePath: string, isFavorite: boolean) {
    db.prepare(`UPDATE file_cache SET is_favorite = ? WHERE relative_path = ?`).run(isFavorite ? 1 : 0, relativePath)
  },
  list() {
    return db.prepare(`SELECT * FROM file_cache WHERE is_favorite = 1`).all()
  },
}

// ── Storage volumes (multi-storage) ──────────────────────────────────────────
export const MAX_VOLUMES = 8

export interface StorageVolume {
  id: number
  label: string
  storage_path: string
  enabled: number   // 1 = active, 0 = inactive
  sort_order: number
  created_at: number
  /** Runtime-populated by the agent on each health check */
  accessible?: boolean
  error?: string | null
}

export const storageVolumes = {
  /** Seed volumes from env on startup — idempotent (UNIQUE on storage_path). */
  seed(paths: string[]) {
    const insert = db.prepare(`
      INSERT INTO storage_volumes (label, storage_path, enabled, sort_order)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(storage_path) DO NOTHING
    `)
    const tx = db.transaction(() => {
      paths.slice(0, MAX_VOLUMES).forEach((p, i) => {
        const label = p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p
        insert.run(label, p, i)
      })
    })
    tx()
  },

  list(): StorageVolume[] {
    return db.prepare(
      `SELECT * FROM storage_volumes ORDER BY sort_order ASC, id ASC`
    ).all() as StorageVolume[]
  },

  /** Only volumes with a non-empty path and enabled = 1 */
  listActive(): StorageVolume[] {
    return db.prepare(
      `SELECT * FROM storage_volumes WHERE enabled = 1 AND storage_path != '' ORDER BY sort_order ASC, id ASC`
    ).all() as StorageVolume[]
  },

  getById(id: number): StorageVolume | undefined {
    return db.prepare(`SELECT * FROM storage_volumes WHERE id = ?`).get(id) as StorageVolume | undefined
  },

  /** Add a new volume (path must not already exist). Returns new row id or null. */
  add(storagePath: string, label?: string): number | null {
    const all = db.prepare(`SELECT COUNT(*) as cnt FROM storage_volumes`).get() as { cnt: number }
    if (all.cnt >= MAX_VOLUMES) return null
    const order = (db.prepare(`SELECT MAX(sort_order) as m FROM storage_volumes`).get() as any)?.m ?? 0
    const name = label || storagePath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || storagePath
    try {
      const info = db.prepare(
        `INSERT INTO storage_volumes (label, storage_path, enabled, sort_order) VALUES (?, ?, 1, ?)`
      ).run(name, storagePath, order + 1)
      return info.lastInsertRowid as number
    } catch {
      return null  // UNIQUE constraint violation — path already registered
    }
  },

  remove(id: number) {
    db.prepare(`DELETE FROM storage_volumes WHERE id = ?`).run(id)
  },

  setEnabled(id: number, enabled: boolean) {
    db.prepare(`UPDATE storage_volumes SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id)
  },

  setLabel(id: number, label: string) {
    db.prepare(`UPDATE storage_volumes SET label = ? WHERE id = ?`).run(label, id)
  },

  /** Reorder: accepts array of ids in desired order */
  reorder(ids: number[]) {
    const update = db.prepare(`UPDATE storage_volumes SET sort_order = ? WHERE id = ?`)
    const tx = db.transaction(() => ids.forEach((id, i) => update.run(i, id)))
    tx()
  },
}