import fs from 'node:fs'
import path from 'node:path'
import { getStorvaDataPaths } from './storva-data-paths.mjs'

const paths = getStorvaDataPaths()
const cwd = process.cwd()
const candidates = [
  process.env.STORVA_LEGACY_DEV_DB_PATH,
  path.join(cwd, 'apps', 'web', 'dev-db.json'),
  path.join(cwd, '.storva-data', 'dev-db.json'),
  path.join(cwd, 'dev-db.json'),
].filter(Boolean)
const stateCollections = ['users', 'sessions', 'devices', 'file_metadata', 'share_links', 'privacy_rules']
const existingCandidates = candidates.filter((candidate) => fs.existsSync(candidate))
const parsedCandidates = existingCandidates.map((candidate) => {
  try {
    const data = JSON.parse(fs.readFileSync(candidate, 'utf8'))
    const meaningful = stateCollections.some((key) => Array.isArray(data?.[key]) && data[key].length > 0)
    return { candidate, data, meaningful }
  } catch {
    return { candidate, data: null, meaningful: false }
  }
})
const selected = parsedCandidates.find((item) => item.meaningful)
const legacy = selected?.candidate || null

if (!legacy) {
  console.error('[STORVA] No legacy dev-db.json containing persistent user state was found.')
  if (existingCandidates.length) console.error('[STORVA] Existing legacy files appear empty or contain runtime-only records; refusing to treat them as the authoritative database.')
  process.exit(1)
}
if (fs.existsSync(paths.databasePath)) {
  console.error(`[STORVA] Persistent database already exists: ${paths.databasePath}`)
  console.error('[STORVA] Refusing to overwrite it. Use the existing persistent database instead.')
  process.exit(2)
}

fs.mkdirSync(path.dirname(paths.databasePath), { recursive: true })
fs.mkdirSync(paths.backupDir, { recursive: true })
fs.mkdirSync(path.dirname(paths.manifestPath), { recursive: true })

const data = JSON.parse(fs.readFileSync(legacy, 'utf8'))
data._meta = {
  ...(data._meta || {}),
  formatVersion: 1,
  appId: 'storva',
  migratedFrom: legacy,
  migratedAt: new Date().toISOString(),
}
const serialized = JSON.stringify(data, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2)
fs.writeFileSync(paths.databasePath, serialized, { encoding: 'utf8', flag: 'wx' })
JSON.parse(fs.readFileSync(paths.databasePath, 'utf8'))

const backupPath = path.join(paths.backupDir, `legacy-source-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.copyFileSync(legacy, backupPath)
JSON.parse(fs.readFileSync(backupPath, 'utf8'))

const manifest = {
  appId: 'storva',
  dataFormatVersion: 1,
  database: 'database/dev-db.json',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  migratedFrom: legacy,
}
fs.writeFileSync(paths.manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

console.log(`[STORVA] Legacy database migrated: ${legacy}`)
console.log(`[STORVA] Persistent database: ${paths.databasePath}`)
console.log(`[STORVA] Legacy backup: ${backupPath}`)
console.log('[STORVA] You can now replace/update the application source tree without carrying the database with it.')
