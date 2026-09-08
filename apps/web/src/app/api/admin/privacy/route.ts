import { repository } from '@/lib/repository'
import { getCurrentUser } from '@/lib/authUtils'
import { NextResponse } from 'next/server'

function unauthorized() {
  return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req)
    if (!user || user.role.toLowerCase() !== 'admin') return unauthorized()

    const path = new URL(req.url).searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

    const rule = await repository.privacyRule.findFirst({ where: { relativePath: normalizePath(path) } })
    if (!rule) return NextResponse.json({ isPrivate: false, userIds: [] })

    return NextResponse.json({
      isPrivate: Boolean(rule.isPrivate),
      userIds: JSON.parse(rule.allowedUsers || '[]'),
    })
  } catch (err) {
    console.error('[GET /api/admin/privacy] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req)
    if (!user || user.role.toLowerCase() !== 'admin') return unauthorized()

    const body = await req.json().catch(() => null)
    const path = typeof body?.path === 'string' ? normalizePath(body.path) : ''
    const isPrivate = Boolean(body?.isPrivate)
    const userIds = Array.isArray(body?.userIds)
      ? [...new Set(body.userIds.filter((id: unknown) => typeof id === 'string'))]
      : []

    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

    const existing = await repository.privacyRule.findFirst({ where: { relativePath: path } })
    if (existing) {
      await repository.privacyRule.update({
        where: { id: existing.id },
        data: { isPrivate, allowedUsers: JSON.stringify(userIds) },
      })
    } else {
      await repository.privacyRule.create({
        data: { relativePath: path, isPrivate, allowedUsers: JSON.stringify(userIds) },
      })
    }

    // Keep privacy changes visible in Activity Log. Link the activity to the
    // matching metadata record when available so the UI can resolve its name.
    try {
      const file = await repository.fileMetadata.findFirst({ where: { relativePath: path } })
      await repository.activity.create({
        data: {
          userId: user.id,
          action: isPrivate ? 'privacy:enable' : 'privacy:disable',
          fileId: file?.id ?? null,
          metadata: JSON.stringify({
            relativePath: path,
            path,
            isPrivate,
            userIds,
            fileName: file?.name || path.split('/').pop() || path,
            isFolder: Boolean(file?.isFolder),
          }),
        },
      })
    } catch (activityErr) {
      // Activity logging is best-effort and must never make privacy changes fail.
      console.warn('[POST /api/admin/privacy] Activity log failed:', activityErr)
    }

    return NextResponse.json({ success: true, isPrivate, userIds })
  } catch (err) {
    console.error('[POST /api/admin/privacy] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
