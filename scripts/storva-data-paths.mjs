import os from 'node:os'
import path from 'node:path'

export function getStorvaDataPaths(env = process.env) {
  let defaultDataDir
  if (process.platform === 'win32') {
    defaultDataDir = env.LOCALAPPDATA
      ? path.join(env.LOCALAPPDATA, 'Storva', 'data')
      : env.PROGRAMDATA
        ? path.join(env.PROGRAMDATA, 'Storva', 'data')
        : path.join(os.homedir(), 'AppData', 'Local', 'Storva', 'data')
  } else if (process.platform === 'darwin') {
    defaultDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Storva', 'data')
  } else {
    defaultDataDir = path.join(env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'storva')
  }

  const dataDir = path.resolve(env.STORVA_DATA_DIR || defaultDataDir)
  const sourceRoots = [path.resolve(process.cwd()), path.resolve(process.cwd(), 'apps', 'web')]
  for (const sourceRoot of sourceRoots) {
    const relative = path.relative(sourceRoot, dataDir)
    const insideSource = relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    if (insideSource) {
      throw new Error(`STORVA_DATA_DIR must be outside the application source tree: ${dataDir}`)
    }
  }
  return {
    dataDir,
    databasePath: path.join(dataDir, 'database', 'dev-db.json'),
    backupDir: path.join(dataDir, 'backups'),
    manifestPath: path.join(dataDir, 'system', 'manifest.json'),
  }
}
