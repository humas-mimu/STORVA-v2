import { repository } from '../../../../lib/repository'
import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'


function setSessionCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 30
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''} Max-Age=${maxAge}`
}


export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json()
    if (!username || !email || !password) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })

    const existing = await repository.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (existing) return new Response(JSON.stringify({ error: 'User already exists' }), { status: 409 })

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
    const user = await repository.user.create({ data: { username, email, passwordHash } })

    const token = randomBytes(32).toString('hex')
    await repository.session.create({ data: { userId: user.id, tokenHash: token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } })

    const cookie = setSessionCookie(token)

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      status: 201,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
