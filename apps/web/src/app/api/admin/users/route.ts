import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/authUtils'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req)
    if (!user || user.role.toLowerCase() !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Fetch all users (we'll map to safe fields)
    const usersRaw = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const users = usersRaw.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }))

    return new Response(JSON.stringify({ users }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser || currentUser.role.toLowerCase() !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { username, password, role } = await req.json()
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const newUser = await prisma.user.create({
      data: {
        username,
        email: `${username}@local`,
        passwordHash,
        role: role === 'admin' ? 'ADMIN' : 'USER',
      },
    })

    return new Response(
      JSON.stringify({ success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
