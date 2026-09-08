import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'node:crypto'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

const SECRET = process.env.SIGNING_PRIVATE_KEY || 'super-secret-signing-key-minimum-32-chars-long'

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return sig === expectedSig ? payload : null
}

function getSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ?? null
}

export async function getCurrentUser(req: Request) {
  const rawCookie = req.headers.get('cookie') || ''
  const token = getSessionToken(rawCookie)
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const username = payload.split(':')[0]
  return prisma.user.findUnique({ where: { username } })
}
