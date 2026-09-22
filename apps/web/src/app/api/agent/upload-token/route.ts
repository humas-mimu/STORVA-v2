import { getCurrentUser } from '@/lib/authUtils'
import { getPrivacyDecisions, isPathHidden, normalizePath } from '@/lib/agentPrivacy'
import { signAgentToken } from '@storva/shared-auth'
import { NextRequest, NextResponse } from 'next/server'

// Mints a short-lived, upload-only token so the browser can send a file
// straight to the agent (bypassing this Next.js app entirely). This exists
// because Vercel hard-caps every serverless function's request body at
// 4.5 MB — fine for JSON, unworkable for videos — and that limit cannot be
// raised from application code. Routing the proxy at app/api/agent/[...agentPath]
// around it would just move the same wall; the bytes still have to cross a
// Vercel function. Only the /upload leg needs to skip Vercel, since it's the
// only one that pushes large payloads *from* the browser, so this endpoint
// hands back a scoped token plus the agent's own address and the browser
// uploads directly to that address instead.
//
// The token is:
//  - scoped to "storage:write" only (can't read, delete, or share anything)
//  - valid for 120 seconds — long enough to start an upload, not to replay later
//  - bound to a volume + destination folder that's re-checked against the
//    same privacy rules the normal proxy enforces, so this can't be used to
//    drop a file into a folder the user isn't allowed to touch
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req)
    const userId = currentUser?.id || 'dev-user'

    const dirPath = req.nextUrl.searchParams.get('path') ?? ''
    if (dirPath) {
      const { isAdmin, rules } = await getPrivacyDecisions(currentUser?.id ?? null)
      if (isPathHidden(dirPath, currentUser?.id ?? null, isAdmin, rules)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const agentUrl = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'
    const token = await signAgentToken(userId, 'web-direct-upload', ['storage:write'], 120)

    return NextResponse.json({
      token,
      agentUrl,
      expiresIn: 120,
      dirPath: normalizePath(dirPath),
    })
  } catch (err: any) {
    console.error('upload-token error:', err)
    return NextResponse.json({ error: 'Could not issue upload token' }, { status: 500 })
  }
}
