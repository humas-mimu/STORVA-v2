import { repository } from '@/lib/repository'
import { signAgentToken } from '@storva/shared-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, deviceId, scopes } = await req.json()
    if (!userId || !deviceId) {
      return NextResponse.json({ error: 'userId and deviceId required' }, { status: 400 })
    }

    const device = await repository.device.findUnique({ where: { id: deviceId } })
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const token = await signAgentToken(userId, deviceId, scopes || ['storage:read'], 300)

    return NextResponse.json({ token, expiresIn: 300 }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
