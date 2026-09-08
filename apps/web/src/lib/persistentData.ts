import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DEV_DB_FORMAT_VERSION = 1

export const DEFAULT_COLLECTIONS = {
  users: [],
  sessions: [],
  devices: [],
  file_metadata: [],
  activities: [],
  upload_sessions: [],
  download_sessions: [],
  share_links: [],
  privacy_rules: [],
} as const

export type PersistentDataPaths = {
  dataDir: string
  databaseDir: string
  databasePath: string
  backupDir: string
  systemDir: string
  manifestPath: string
}

function defaultDataDir() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) return path.join(localAppData, 'Storva', 'data')
    const programData = process.env.PROGRAMDATA
    if (programData) return path.join(programData, 'Storva', 'data')
    return path.join(os.homedir(), 'AppData', 'Local', 'Storva', 'data')
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Storva', 'data')
  }

  const dataHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state')
  return path.join(dataHome, 'storva')
}

function assertDataDirectoryIsExternal(dataDir: string) {
  const sourceRoots = [
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), 'apps', 'web'),
  ]

  for (const sourceRoot of sourceRoots) {
    const relative = path.relative(sourceRoot, dataDir)
    const insideSource = relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    if (insideSource) {
      throw new Error(
        `STORVA_DATA_DIR must be outside the application source tree. Received: ${dataDir}`,
      )
    }
  }
}

export function getPersistentDataPaths(): PersistentDataPaths {
  const dataDir = path.resolve(process.env.STORVA_DATA_DIR || defaultDataDir())
  assertDataDirectoryIsExternal(dataDir)
  const databaseDir = path.join(dataDir, 'database')
  return {
    dataDir,
    databaseDir,
    databasePath: path.join(databaseDir, 'dev-db.json'),
    backupDir: path.join(dataDir, 'backups'),
    systemDir: path.join(dataDir, 'system'),
    manifestPath: path.join(dataDir, 'system', 'manifest.json'),
  }
}

export function createEmptyDatabase() {
  const collections = Object.fromEntries(
    Object.keys(DEFAULT_COLLECTIONS).map((key) => [key, []]),
  )

  return {
    _meta: {
      formatVersion: DEV_DB_FORMAT_VERSION,
      appId: 'storva',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...collections,
  }
}

function ensureDirectories(paths: PersistentDataPaths) {
  fs.mkdirSync(paths.databaseDir, { recursive: true })
  fs.mkdirSync(paths.backupDir, { recursive: true })
  fs.mkdirSync(paths.systemDir, { recursive: true })
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJsonAtomic(filePath: string, value: unknown) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  const serialized = JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current), 2)
  fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', flag: 'wx' })
  try {
    fs.rmSync(filePath, { force: true })
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    fs.rmSync(tempPath, { force: true })
    throw error
  }
}

function normalizeDatabase(loaded: any) {
  const database = {
    ...createEmptyDatabase(),
    ...(loaded && typeof loaded === 'object' ? loaded : {}),
  }

  for (const key of Object.keys(DEFAULT_COLLECTIONS)) {
    if (!Array.isArray(database[key])) database[key] = []
  }

  return database
}

function createManifest(paths: PersistentDataPaths) {
  return {
    appId: 'storva',
    dataFormatVersion: DEV_DB_FORMAT_VERSION,
    database: 'database/dev-db.json',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    platform: process.platform,
    dataDir: paths.dataDir,
  }
}

function ensureManifest(paths: PersistentDataPaths) {
  if (!fs.existsSync(paths.manifestPath)) {
    writeJsonAtomic(paths.manifestPath, createManifest(paths))
    return
  }

  const manifest = readJson(paths.manifestPath)
  if (manifest?.appId !== 'storva') {
    throw new Error(`Invalid STORVA data directory: ${paths.manifestPath}`)
  }
  if (Number(manifest.dataFormatVersion || 0) > DEV_DB_FORMAT_VERSION) {
    throw new Error(
      `STORVA data format ${manifest.dataFormatVersion} is newer than this application supports (max ${DEV_DB_FORMAT_VERSION}). Update STORVA before opening this data directory.`,
    )
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

function containsUserData(root: string) {
  try {
    if (!fs.statSync(root).isDirectory()) return false
    const ignored = new Set(['.staging', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'System Volume Information'])
    return fs.readdirSync(root, { withFileTypes: true }).some((entry) => !ignored.has(entry.name))
  } catch {
    return false
  }
}

export function storageHasUserData() {
  return storageRoots().some((root) => containsUserData(root))
}

function legacyCandidates() {
  const cwd = process.cwd()
  return [
    process.env.STORVA_LEGACY_DEV_DB_PATH,
    path.join(cwd, '.storva-data', 'dev-db.json'),
    path.join(cwd, 'dev-db.json'),
    path.join(cwd, 'apps', 'web', 'dev-db.json'),
  ].filter((value): value is string => Boolean(value))
}

const STATE_COLLECTIONS = ['users', 'sessions', 'devices', 'file_metadata', 'share_links', 'privacy_rules']

function hasPersistentState(database: any) {
  return STATE_COLLECTIONS.some((key) => Array.isArray(database?.[key]) && database[key].length > 0)
}

export function findLegacyDatabase() {
  const candidates = legacyCandidates()
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => {
      try {
        const database = normalizeDatabase(readJson(candidate))
        return { candidate, database, meaningful: hasPersistentState(database) }
      } catch {
        return { candidate, database: null, meaningful: false }
      }
    })

  return candidates.find((item) => item.meaningful)?.candidate || null
}

export function backupDatabase(sourcePath?: string, reason = 'manual') {
  const paths = getPersistentDataPaths()
  ensureDirectories(paths)
  const source = sourcePath || paths.databasePath
  if (!fs.existsSync(source)) {
    throw new Error(`STORVA database not found: ${source}`)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destination = path.join(paths.backupDir, `backup-${timestamp}-${reason}.json`)
  const parsed = readJson(source)
  writeJsonAtomic(destination, parsed)

  // Verify the backup can be parsed before declaring it successful.
  readJson(destination)
  return destination
}

export function preparePersistentDatabase() {
  const paths = getPersistentDataPaths()
  ensureDirectories(paths)
  ensureManifest(paths)

  if (!fs.existsSync(paths.databasePath)) {
    const legacy = findLegacyDatabase()
    if (legacy) {
      const legacyDatabase = normalizeDatabase(readJson(legacy))
      const legacyBackup = path.join(
        paths.backupDir,
        `legacy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      )
      writeJsonAtomic(legacyBackup, legacyDatabase)
      readJson(legacyBackup)
      writeJsonAtomic(paths.databasePath, legacyDatabase)
      return { ...paths, data: legacyDatabase, migratedFrom: legacy, backupPath: legacyBackup }
    }

    const allowEmpty = process.env.STORVA_ALLOW_EMPTY_DB === 'true'
    if (storageHasUserData() && !allowEmpty) {
      throw new Error(
        [
          'STORVA persistent database is missing while configured storage contains user data.',
          `Expected database: ${paths.databasePath}`,
          'For safety, Storva will not create a new empty database automatically.',
          'Restore or migrate the existing database first, or explicitly set STORVA_ALLOW_EMPTY_DB=true only when initializing a new metadata database.',
        ].join('\n'),
      )
    }

    const freshDatabase = createEmptyDatabase()
    writeJsonAtomic(paths.databasePath, freshDatabase)
    return { ...paths, data: freshDatabase, migratedFrom: null as string | null, backupPath: null as string | null }
  }

  const loaded = readJson(paths.databasePath)
  const database = normalizeDatabase(loaded)
  const version = Number(database?._meta?.formatVersion || 0)

  if (version > DEV_DB_FORMAT_VERSION) {
    throw new Error(
      `STORVA data format ${version} is newer than this application supports (max ${DEV_DB_FORMAT_VERSION}).`,
    )
  }

  let backupPath: string | null = null
  if (version < DEV_DB_FORMAT_VERSION) {
    backupPath = backupDatabase(paths.databasePath, `migration-v${version}-to-v${DEV_DB_FORMAT_VERSION}`)
  }

  database._meta = {
    ...(database._meta || {}),
    formatVersion: DEV_DB_FORMAT_VERSION,
    appId: 'storva',
    updatedAt: new Date().toISOString(),
  }
  if (version < DEV_DB_FORMAT_VERSION) writeJsonAtomic(paths.databasePath, database)

  return { ...paths, data: database, migratedFrom: null as string | null, backupPath }
}
