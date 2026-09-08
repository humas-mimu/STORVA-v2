import fs from 'node:fs'
import { getStorvaDataPaths } from './storva-data-paths.mjs'

const paths = getStorvaDataPaths()
const exists = fs.existsSync(paths.databasePath)
console.log(`[STORVA] Persistent data: ${paths.dataDir}`)
console.log(`[STORVA] Database: ${paths.databasePath}`)
console.log(`[STORVA] Database exists: ${exists ? 'YES' : 'NO'}`)
if (!exists) process.exit(1)

let parsed
try {
  parsed = JSON.parse(fs.readFileSync(paths.databasePath, 'utf8'))
} catch {
  console.error('[STORVA] Database JSON is invalid.')
  process.exit(2)
}

const collections = ['users', 'sessions', 'devices', 'file_metadata', 'activities', 'upload_sessions', 'download_sessions', 'share_links', 'privacy_rules']
const missing = collections.filter((key) => !Array.isArray(parsed[key]))
if (missing.length) {
  console.error(`[STORVA] Missing collections: ${missing.join(', ')}`)
  process.exit(3)
}

console.log(`[STORVA] Format version: ${parsed?._meta?.formatVersion ?? 'legacy'}`)
for (const key of collections) console.log(`[STORVA] ${key}: ${parsed[key].length}`)
console.log('[STORVA] Persistent database looks readable.')
