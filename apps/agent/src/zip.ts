import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'
import type { Response } from 'express'
import archiver from 'archiver'
import { resolveSafePath } from '@storva/validation'

export interface ZipEntry {
  safePath: string
  entryName: string
  isDirectory: boolean
}

export interface StreamZipOptions {
  /** Absolute root of the volume — used to compute relative paths for `excludePaths`. */
  volumeRoot: string
  /** File/folder names that are never included (compared case-insensitively, never descended into). */
  ignoredNames: Iterable<string>
  /** Volume-relative paths (forward slashes) that must be left out, together with everything below them. */
  excludePaths?: Iterable<string>
  fileName?: string
}

const normalizeRel = (p: string) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase()

/**
 * Resolve and stat every requested path up front, so a bad path is reported as
 * a normal JSON error *before* we start streaming the zip.
 * Top-level name collisions get a " (2)", " (3)" ... suffix.
 */
export async function prepareZipEntries(volumeRoot: string, requestedPaths: string[]): Promise<ZipEntry[]> {
  const used = new Set<string>()
  const entries: ZipEntry[] = []
  for (const rel of requestedPaths) {
    const safePath = resolveSafePath(volumeRoot, rel)
    const stat = await fsp.stat(safePath)
    const base = path.basename(safePath) || 'Storva-Root'
    let entryName = base
    for (let i = 2; used.has(entryName.toLowerCase()); i++) entryName = `${base} (${i})`
    used.add(entryName.toLowerCase())
    entries.push({ safePath, entryName, isDirectory: stat.isDirectory() })
  }
  return entries
}

/**
 * Stream the given entries as a single zip.
 *
 * Unreadable files/folders (EPERM, EBUSY, broken links, ...) are skipped and
 * listed in "!Storva-Skipped.txt" inside the zip instead of aborting the whole
 * download. If something fatal happens after the response has started, the
 * connection is destroyed so the client sees a *failed* download rather than a
 * silently truncated zip ("Unexpected end of archive").
 */
export async function streamZip(res: Response, entries: ZipEntry[], opts: StreamZipOptions): Promise<void> {
  const ignored = new Set([...opts.ignoredNames].map((n) => n.toLowerCase()))
  const excluded = new Set([...(opts.excludePaths ?? [])].map(normalizeRel).filter(Boolean))
  const skipped: string[] = []

  const isExcluded = (abs: string) => {
    if (excluded.size === 0) return false
    const rel = path.relative(opts.volumeRoot, abs).split(path.sep).join('/').toLowerCase()
    let acc = ''
    for (const part of rel.split('/')) {
      acc = acc ? `${acc}/${part}` : part
      if (excluded.has(acc)) return true
    }
    return false
  }

  const archive = archiver('zip', { zlib: { level: 1 } })

  let aborted = false
  let cancel: ((err: Error) => void) | null = null
  let activeSource: Readable | null = null

  const abortAll = (err: Error) => {
    if (aborted) return
    aborted = true
    activeSource?.destroy()
    archive.abort()
    cancel?.(err)
  }

  archive.on('warning', (err) => console.warn('[Storva Agent] zip warning:', err.message))
  archive.on('error', (err) => {
    console.error('[Storva Agent] zip error:', err.message)
    abortAll(err)
    res.destroy()
  })
  res.on('close', () => {
    if (!res.writableFinished) abortAll(new Error('Client disconnected'))
  })

  // Append one entry and wait until archiver has fully processed it, so only
  // one file handle is open at a time and errors surface at the right place.
  const appendEntry = (source: Buffer | Readable, data: archiver.EntryData) =>
    new Promise<void>((resolve, reject) => {
      if (aborted) return reject(new Error('Aborted'))
      cancel = reject
      archive.once('entry', () => { cancel = null; resolve() })
      archive.append(source as any, data)
    })

  const skip = (label: string, err: any) => {
    const reason = err?.code || err?.message || 'unreadable'
    skipped.push(`${label}  [${reason}]`)
    console.warn(`[Storva Agent] zip: skipped "${label}" (${reason})`)
  }

  const addFile = async (abs: string, name: string) => {
    let fh
    try { fh = await fsp.open(abs, 'r') } catch (err) { skip(name, err); return }
    let st
    try { st = await fh.stat() } catch (err) { await fh.close().catch(() => {}); skip(name, err); return }
    if (!st.isFile()) { await fh.close().catch(() => {}); skip(name, { message: 'not a regular file' }); return }
    const stream = fh.createReadStream()
    // Without a listener a read error would be an unhandled 'error' event and
    // take the whole agent process down.
    stream.on('error', (err) => {
      console.error(`[Storva Agent] zip: read error on "${name}":`, err.message)
      abortAll(err)
      res.destroy()
    })
    activeSource = stream
    try { await appendEntry(stream, { name, date: st.mtime }) } finally { activeSource = null }
  }

  const addDir = async (abs: string, name: string) => {
    // Explicit directory entry so empty folders survive the round trip.
    await appendEntry(Buffer.alloc(0), { name: `${name}/` })
    let dirents
    try { dirents = await fsp.readdir(abs, { withFileTypes: true }) } catch (err) { skip(name, err); return }
    for (const d of dirents) {
      if (ignored.has(d.name.toLowerCase())) continue
      const childAbs = path.join(abs, d.name)
      if (isExcluded(childAbs)) continue
      const childName = `${name}/${d.name}`
      if (d.isDirectory()) await addDir(childAbs, childName)
      else if (d.isFile()) await addFile(childAbs, childName)
      else skip(childName, { message: d.isSymbolicLink() ? 'symlink/junction not followed' : 'unsupported entry type' })
    }
  }

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${opts.fileName ?? 'Storva-Files.zip'}"`,
  })
  archive.pipe(res)

  try {
    for (const e of entries) {
      if (isExcluded(e.safePath)) continue
      if (e.isDirectory) await addDir(e.safePath, e.entryName)
      else await addFile(e.safePath, e.entryName)
    }
    if (skipped.length > 0) {
      const report =
        'These items could not be added to the archive and were skipped:\r\n\r\n' + skipped.join('\r\n') + '\r\n'
      await appendEntry(Buffer.from(report, 'utf8'), { name: '!Storva-Skipped.txt' })
    }
    await new Promise<void>((resolve, reject) => {
      cancel = reject
      archive.finalize().then(resolve, reject)
    })
  } catch (err: any) {
    if (!aborted) {
      console.error('[Storva Agent] zip failed:', err?.message ?? err)
      abortAll(err)
    }
    res.destroy()
  }
}
