import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { z } from 'zod'

export const TOKEN_SCOPES = {
  read: 'storage:read',
  write: 'storage:write',
  delete: 'storage:delete',
  share: 'storage:share',
} as const

export const ScopeSchema = z.array(z.enum(['storage:read', 'storage:write', 'storage:delete', 'storage:share']))
export type Scope = z.infer<typeof ScopeSchema>

export interface SignedPayload extends JWTPayload {
  sub?: string
  deviceId: string
  scopes: Scope
}

const JWT_NAME = 'storva.token'

const DEFAULT_KEY = 'super-secret-signing-key-minimum-32-chars-long'

function secret(): Uint8Array {
  const s = process.env.SIGNING_PRIVATE_KEY || DEFAULT_KEY
  return new TextEncoder().encode(s)
}

export function getSigningSecret() {
  return secret()
}

export async function signAgentToken(
  userId: string,
  deviceId: string,
  scopes: Scope,
  ttlSeconds = 300
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ttlSeconds
  return new SignJWT({ deviceId, scopes })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(crypto.randomUUID())
    .sign(secret())
}

export async function verifyAgentToken(token: string): Promise<SignedPayload> {
  const { payload } = await jwtVerify(token, secret(), {
    algorithms: ['HS256'],
    maxTokenAge: '10m',
  })
  const scopes = ScopeSchema.parse(payload.scopes)
  const deviceId = z.string().parse(payload.deviceId)
  return { ...payload, deviceId, scopes } as SignedPayload
}

export function hasScope(scopes: Scope, required: string): boolean {
  // ponytail: scope inheritance — read implies ability for list/info; write needed for upload
  if ((scopes as string[]).includes(required)) return true
  // convenience shortnames
  const map: Record<string, string> = { read: 'storage:read', write: 'storage:write', delete: 'storage:delete', share: 'storage:share' }
  const full = map[required] || required
  return (scopes as string[]).includes(full)
}
