import { repository } from './repository'

export function getSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  return match?.[1] ?? null
}

export async function getSessionUserId(req: Request): Promise<string | null> {
  const token = getSessionToken(req.headers.get('cookie') || '')
  if (!token) return null

  const session = await repository.session.findFirst({
    where: { tokenHash: token, expiresAt: { gte: new Date() } },
  })
  return session?.userId ?? null
}
