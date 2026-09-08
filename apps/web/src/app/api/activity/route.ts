import { repository } from '../../../lib/repository'
import { getCurrentUser } from '@/lib/authUtils'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

    const [items, total] = await Promise.all([
      repository.activity.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { 
          file: { select: { name: true, relativePath: true, isFolder: true } },
          user: { select: { username: true } }
        },
      }),
      repository.activity.count(),
    ])

    return Response.json({ items, total, page, pageSize: limit })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, fileId, metadata } = await req.json()
    if (!action) return Response.json({ error: 'action required' }, { status: 400 })

    const activity = await repository.activity.create({
      data: { 
        userId: currentUser.id, 
        action, 
        fileId, 
        metadata: metadata ? JSON.stringify(metadata) : null 
      },
    })
    return Response.json({ success: true, id: activity.id }, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
