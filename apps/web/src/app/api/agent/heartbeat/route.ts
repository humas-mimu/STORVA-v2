import { repository } from '../../../../lib/repository'

export async function POST(req: Request) {
  try {
    const { deviceId, version, storageStatus } = await req.json()
    if (!deviceId) return new Response(JSON.stringify({ error: 'deviceId required' }), { status: 400 })

    const device = await repository.device.update({
      where: { id: deviceId },
      data: { lastSeen: new Date(), agentVersion: version || '0.1.0' },
    })

    return new Response(JSON.stringify({ success: true, serverTime: Date.now() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
