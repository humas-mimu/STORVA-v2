import { repository } from '@/lib/repository'
import { generateTOTPSecret } from '@storva/shared-auth/totp'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Auth check (assume middleware handled this)
    const userId = req.nextUrl.searchParams.get('userId') // Simplified
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { secret } = generateTOTPSecret(userId)
    await repository.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    })

    return NextResponse.json({ secret })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
