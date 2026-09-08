import { repository } from '@/lib/repository'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

const PREFIX = 'storva-share:'
const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function signAccess(token: string) {
  const payload = `${PREFIX}${token}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const { passkey } = await req.json()
    const share = await repository.shareLink.findUnique({ where: { token } })
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!share.passwordHash) return NextResponse.json({ valid: true })

    const valid = share.passwordHash === passkey
    if (!valid) return NextResponse.json({ error: 'Passkey salah' }, { status: 401 })

    const response = NextResponse.json({ valid: true })
    response.cookies.set(`share_${token}`, signAccess(token), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: `/api/share/${token}`,
      maxAge: 60 * 60 * 8,
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
