import { repository } from '../../../../lib/repository'
import { randomInt } from 'node:crypto'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    // 6-digit pairing code, stored in activity as special record, expires 10 mins
    const code = String(randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await repository.activity.create({
      data: {
        userId,
        action: 'PAIRING_CODE',
        metadata: JSON.stringify({ code, expiresAt: expiresAt.toISOString() }),
      },
    })

    return Response.json({ code, expiresAt }, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
