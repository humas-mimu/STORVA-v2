import { repository } from '../../../../lib/repository'

export async function POST(req: Request) {
  try {
    const { deviceName, publicKey, agentVersion, userId } = await req.json()
    if (!deviceName || !publicKey || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const device = await repository.device.create({
      data: {
        userId,
        deviceName,
        publicKey,
        agentVersion: agentVersion || '0.1.0',
      },
    })

    return new Response(JSON.stringify({ success: true, deviceId: device.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
