import { repository } from '@/lib/repository'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const devices = await repository.device.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' },
    })

    return NextResponse.json({ items: devices })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
