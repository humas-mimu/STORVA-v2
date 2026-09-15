import { repository } from '@/lib/repository'
import { getCurrentUser } from '@/lib/authUtils'

async function getOrCreateDevice(userId: string) {
  const existing = await repository.device.findFirst({ where: { userId } })
  if (existing) return existing

  return repository.device.create({
    data: {
      userId,
      deviceName: 'Local Agent (auto-registered)',
      publicKey: `auto:${userId}`,
      agentVersion: '0.1.0',
    },
  })
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const favorites = await repository.fileMetadata.findMany({
      where: { userId: user.id, isFavorite: true, isDeleted: false },
      orderBy: { updatedAt: 'desc' },
    })

    // BigInt serialization string conversion
    const items = favorites.map((f: any) => ({ ...f, size: f.size.toString() }))
    return Response.json({ items })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { fileId, relativePath, name, isFolder, size, mimeType, extension, isFavorite } = await req.json()
    const user = await getCurrentUser(req)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!fileId && !relativePath) return Response.json({ error: 'fileId or relativePath required' }, { status: 400 })

    let file = fileId
      ? await repository.fileMetadata.findUnique({ where: { id: fileId } })
      : await repository.fileMetadata.findFirst({ where: { userId: user.id, relativePath } })

    if (file) {
      file = await repository.fileMetadata.update({
        where: { id: file.id },
        data: { isFavorite: Boolean(isFavorite) },
      })
    } else {
      const device = await getOrCreateDevice(user.id)
      file = await repository.fileMetadata.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          name: name || relativePath.split('/').pop() || relativePath,
          relativePath,
          isFolder: Boolean(isFolder),
          isFavorite: Boolean(isFavorite),
          size: BigInt(Number(size) || 0),
          mimeType: mimeType || 'application/octet-stream',
          extension: extension || '',
        }
      })
    }

    return Response.json({ success: true, isFavorite: file.isFavorite })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
