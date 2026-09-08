import fs from 'node:fs'
import path from 'node:path'
import { getStorvaDataPaths } from './storva-data-paths.mjs'

const paths = getStorvaDataPaths()
if (!fs.existsSync(paths.databasePath)) {
  console.error(`[STORVA] Database not found: ${paths.databasePath}`)
  process.exit(1)
}

fs.mkdirSync(paths.backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const destination = path.join(paths.backupDir, `backup-${stamp}-manual.json`)
const raw = fs.readFileSync(paths.databasePath, 'utf8')
JSON.parse(raw)
fs.writeFileSync(destination, raw, 'utf8')
JSON.parse(fs.readFileSync(destination, 'utf8'))
console.log(`[STORVA] Backup created and verified: ${destination}`)
