/**
 * /api/storage/sync
 * Fetches the file listing from the local agent and upserts every file/folder
 * into the `file_metadata` table so that share links (and other DB-backed
 * features) can reference them.
 *
 * POST /api/storage/sync          — sync the active/default volume
 * POST /api/storage/sync?vol=X    — sync a specific volume label
 */
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authUtils'
import { signAgentToken } from '@storva/shared-auth'
import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

type AgentFile = {
  name: string
  relativePath: string
  size: number
  mimeType?: string
  extension?: string
  isFolder?: boolean
  checksum?: string
}

async function getOrAutoRegisterDevice(userId: string) {
  const existing = await prisma.device.findFirst({ where: { userId } })
  if (existing) return existing

  let agentVersion = '0.1.0'
  try {
    const res = await fetch(`${AGENT_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3_000) })
    if (res.ok) agentVersion = (await res.json()).version ?? agentVersion
  } catch { /* offline — use default */ }

  return prisma.device.create({
    data: {
      userId,
      deviceName: 'Local Agent (auto-registered)',
      publicKey: `auto:${userId}`,
      agentVersion,
    },
  })
}

async function listAllFiles(token: string, vol?: string): Promise<AgentFile[]> {
  const url = new URL('/files', AGENT_URL)
  if (vol) url.searchParams.set('vol', vol)
  url.searchParams.set('recursive', 'true')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Agent error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.files ?? data.items ?? [])
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const device = await getOrAutoRegisterDevice(currentUser.id)
    const vol = req.nextUrl.searchParams.get('vol') ?? undefined
    const agentToken = await signAgentToken(currentUser.id, device.id, ['storage:read'], 120)
    const files = await listAllFiles(agentToken, vol)

    let upserted = 0
    let skipped = 0

    for (const f of files) {
      if (!f.relativePath) { skipped++; continue }
      const name = f.name || f.relativePath.split('/').filter(Boolean).pop() || f.relativePath
      const ext = f.extension ?? (f.isFolder ? '' : name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '')
      const mime = f.mimeType ?? (f.isFolder ? 'inode/directory' : 'application/octet-stream')

      // relativePath is NOT @unique in schema — use findFirst + create/update
      const existing = await prisma.fileMetadata.findFirst({ where: { relativePath: f.relativePath } })
      if (existing) {
        await prisma.fileMetadata.update({
          where: { id: existing.id },
          data: { name, size: BigInt(f.size ?? 0), mimeType: mime, extension: ext, isFolder: f.isFolder ?? false, checksum: f.checksum ?? null },
        })
      } else {
        await prisma.fileMetadata.create({
          data: {
            userId: currentUser.id,
            deviceId: device.id,
            name,
            relativePath: f.relativePath,
            size: BigInt(f.size ?? 0),
            mimeType: mime,
            extension: ext,
            isFolder: f.isFolder ?? false,
            checksum: f.checksum ?? null,
          },
        })
      }
      upserted++
    }

    return NextResponse.json({ success: true, upserted, skipped, total: files.length })
  } catch (err: any) {
    console.error('[storage/sync]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
