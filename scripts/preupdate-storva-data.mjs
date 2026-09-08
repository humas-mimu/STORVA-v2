import fs from 'node:fs'
import path from 'node:path'
import { getStorvaDataPaths } from './storva-data-paths.mjs'

const paths = getStorvaDataPaths()
if (!fs.existsSync(paths.databasePath)) {
  console.error(`[STORVA] Cannot prepare an update: persistent database is missing: ${paths.databasePath}`)
  console.error('[STORVA] Do not replace the application source until the existing metadata database has been restored or migrated.')
  process.exit(1)
}

let database
try {
  database = JSON.parse(fs.readFileSync(paths.databasePath, 'utf8'))
} catch {
  console.error('[STORVA] Cannot prepare an update: persistent database JSON is invalid.')
  process.exit(2)
}

const requiredCollections = ['users', 'sessions', 'devices', 'file_metadata', 'activities', 'upload_sessions', 'download_sessions', 'share_links', 'privacy_rules']
const missing = requiredCollections.filter((key) => !Array.isArray(database[key]))
if (missing.length) {
  console.error(`[STORVA] Cannot prepare an update: missing database collections: ${missing.join(', ')}`)
  process.exit(3)
}

fs.mkdirSync(paths.backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const destination = path.join(paths.backupDir, `backup-${stamp}-preupdate.json`)
fs.copyFileSync(paths.databasePath, destination)
JSON.parse(fs.readFileSync(destination, 'utf8'))

console.log(`[STORVA] Pre-update check passed.`)
console.log(`[STORVA] Persistent data: ${paths.dataDir}`)
console.log(`[STORVA] Backup created and verified: ${destination}`)
console.log('[STORVA] Safe to replace the application source tree now; keep the persistent data directory intact.')
