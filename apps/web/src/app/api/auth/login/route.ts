import { createHmac, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/authUtils'

const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function signToken(payload: string): string {
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), { status: 400 })
    }

    // Find user in database
    let user = await prisma.user.findUnique({ where: { username } })

    // Bootstrap: if no users exist, create admin from env
    if (!user) {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        const envUsername = process.env.ADMIN_USERNAME || 'admin'
        const envPassword = process.env.ADMIN_PASSWORD || 'password'
        
        if (username === envUsername && password === envPassword) {
          const hashedPassword = await hashPassword(envPassword)
          user = await prisma.user.create({
            data: {
              username: envUsername,
              email: `${envUsername}@local`,
              passwordHash: hashedPassword,
              role: 'ADMIN',
            },
          })
        } else {
          return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 })
        }
      } else {
        return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 })
      }
    } else {
      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash)
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 })
      }
    }

    // Create a signed token
    const nonce = randomBytes(16).toString('hex')
    const payload = `${user.username}:${nonce}`
    const token = signToken(payload)

    const maxAge = 60 * 60 * 24 * 30 // 30 days
    const cookie = `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`

    return new Response(
      JSON.stringify({ success: true, user: { username: user.username, role: user.role, id: user.id } }),
      { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('Login error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
