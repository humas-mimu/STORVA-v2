import { repository } from '../../../../lib/repository'

export async function POST(req: Request) {
  try {
    const { code, deviceName, publicKey, agentVersion } = await req.json()
    if (!code || !deviceName || !publicKey) {
      return Response.json({ error: 'code, deviceName, and publicKey required' }, { status: 400 })
    }

    const recentCodes = await repository.activity.findMany({
      where: { action: 'PAIRING_CODE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const match = recentCodes.find((row: any) => {
      if (!row.metadata) return false
      const meta = JSON.parse(row.metadata)
      return meta.code === code && new Date(meta.expiresAt).getTime() > Date.now()
    })

    if (!match) return Response.json({ error: 'Invalid or expired pairing code' }, { status: 401 })

    const device = await repository.device.create({
      data: {
        userId: match.userId,
        deviceName,
        publicKey,
        agentVersion: agentVersion || '0.1.0',
      },
    })

    await repository.activity.create({
      data: {
        userId: match.userId,
        action: 'PAIR_DEVICE',
        metadata: JSON.stringify({ deviceId: device.id, deviceName }),
      },
    })

    return Response.json({ success: true, deviceId: device.id }, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
