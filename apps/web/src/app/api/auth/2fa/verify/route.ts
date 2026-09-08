import { repository } from '@/lib/repository'
import { verifyTOTP } from '@storva/shared-auth/totp'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const { token } = await req.json()

    if (!userId || !token) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

    const user = await repository.user.findUnique({ where: { id: userId } })
    if (!user || !user.totpSecret) return NextResponse.json({ error: 'Not configured' }, { status: 400 })

    const valid = verifyTOTP(token, user.totpSecret)
    if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    // Enable 2FA permanently if not already
    if (!user.twoFactorEnabled) {
      await repository.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
