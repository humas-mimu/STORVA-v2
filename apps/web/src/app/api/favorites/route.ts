import { repository } from '../../../lib/repository'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    const favorites = await repository.fileMetadata.findMany({
      where: { userId, isFavorite: true, isDeleted: false },
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
    const { fileId, isFavorite } = await req.json()
    if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400 })

    const file = await repository.fileMetadata.update({
      where: { id: fileId },
      data: { isFavorite: Boolean(isFavorite) },
    })

    return Response.json({ success: true, isFavorite: file.isFavorite })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
