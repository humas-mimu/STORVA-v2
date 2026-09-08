import { createHmac } from 'node:crypto'
import { prisma } from '@/lib/prisma'

const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('hex')
  if (sig === expectedSig) {
    return payload // Return the payload if signature is valid
  }
  return null
}

function getSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ?? null
}

export async function GET(req: Request) {
  try {
    const rawCookie = req.headers.get('cookie') || ''
    const token = getSessionToken(rawCookie)
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated: No token' }), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Not authenticated: Invalid token' }), { status: 401 })
    }

    const username = payload.split(':')[0]
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 401 })
    }

    return new Response(
      JSON.stringify({ user: { username: user.username, role: user.role, id: user.id } }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('Auth me error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
