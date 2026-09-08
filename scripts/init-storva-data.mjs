import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { getStorvaDataPaths } from './storva-data-paths.mjs'

const paths = getStorvaDataPaths()

const collections = [
  'users', 'sessions', 'devices', 'file_metadata', 'activities',
  'upload_sessions', 'download_sessions', 'share_links', 'privacy_rules',
]

function createEmptyDatabase() {
  const now = new Date().toISOString()
  return {
    _meta: {
      formatVersion: 1,
      appId: 'storva',
      createdAt: now,
      updatedAt: now,
    },
    ...Object.fromEntries(collections.map((key) => [key, []])),
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' })
  try {
    fs.rmSync(filePath, { force: true })
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    fs.rmSync(tempPath, { force: true })
    throw error
  }
}

function storageRoots() {
  const multi = (process.env.STORVA_STORAGE_PATHS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (multi.length) return multi

  const single = process.env.STORVA_STORAGE_PATH?.trim()
  return single ? [single] : []
}

function containsUserData(root) {
  try {
    if (!fs.statSync(root).isDirectory()) return false
    const ignored = new Set([
      '.staging', '.DS_Store', 'Thumbs.db', 'desktop.ini',
      'System Volume Information',
    ])
    return fs.readdirSync(root, { withFileTypes: true })
      .some((entry) => !ignored.has(entry.name))
  } catch {
    return false
  }
}

function findLegacyDatabase() {
  const cwd = process.cwd()
  const candidates = [
    process.env.STORVA_LEGACY_DEV_DB_PATH,
    path.join(cwd, 'apps', 'web', 'dev-db.json'),
    path.join(cwd, '.storva-data', 'dev-db.json'),
    path.join(cwd, 'dev-db.json'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      const meaningful = ['users', 'file_metadata', 'share_links', 'privacy_rules']
        .some((key) => Array.isArray(data?.[key]) && data[key].length > 0)
      if (meaningful) return candidate
    } catch {
      // Ignore invalid/empty candidates here; migration command handles them explicitly.
    }
  }
  return null
}

console.log(`[STORVA] Persistent data: ${paths.dataDir}`)
console.log(`[STORVA] Database: ${paths.databasePath}`)

if (fs.existsSync(paths.databasePath)) {
  console.log('[STORVA] Database already exists. Nothing to initialize.')
  process.exit(0)
}

const legacy = findLegacyDatabase()
if (legacy) {
  console.error(`[STORVA] Legacy database detected: ${legacy}`)
  console.error('[STORVA] Do not create a new empty database. Run: pnpm storva:data:migrate-legacy')
  process.exit(2)
}

const configuredRoots = storageRoots().filter((root) => containsUserData(root))
if (configuredRoots.length) {
  console.error('[STORVA] Existing user files were detected in configured storage:')
  for (const root of configuredRoots) console.error(`  - ${root}`)
  console.error('[STORVA] Refusing to create an empty metadata database because it could orphan existing files.')
  console.error('[STORVA] Restore/migrate the existing database first.')
  process.exit(3)
}

fs.mkdirSync(path.dirname(paths.databasePath), { recursive: true })
fs.mkdirSync(paths.backupDir, { recursive: true })
fs.mkdirSync(path.join(paths.dataDir, 'system'), { recursive: true })

const database = createEmptyDatabase()
writeJsonAtomic(paths.databasePath, database)

const manifest = {
  appId: 'storva',
  dataFormatVersion: 1,
  database: 'database/dev-db.json',
  createdAt: database._meta.createdAt,
  updatedAt: database._meta.updatedAt,
  platform: process.platform,
  dataDir: paths.dataDir,
}
writeJsonAtomic(paths.manifestPath, manifest)

JSON.parse(fs.readFileSync(paths.databasePath, 'utf8'))
JSON.parse(fs.readFileSync(paths.manifestPath, 'utf8'))

console.log('[STORVA] Empty persistent database initialized successfully.')
console.log(`[STORVA] Database: ${paths.databasePath}`)
console.log(`[STORVA] Manifest: ${paths.manifestPath}`)
