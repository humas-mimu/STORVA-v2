import { NextResponse, NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10

// In-memory store (dev-only). Replace with Redis/DB in production multi-instance.
const store = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false // allowed
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return true // blocked
  return false
}

const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/pairing']

// Paths excluded from auth check (login itself must be accessible without session)
const AUTH_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/me']

export function middleware(req: NextRequest) {
  // Rate limiting on sensitive endpoints
  if (SENSITIVE_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'
    const key = `${req.nextUrl.pathname}:${ip}`
    if (rateLimit(key)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
  }

  // Auth guard: block write operations (POST/PUT/DELETE/PATCH) without session cookie
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const isExempt = AUTH_EXEMPT_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
    const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)

    if (isWriteMethod && !isExempt) {
      const cookieHeader = req.headers.get('cookie') || ''
      const hasSession = /(?:^|;\s*)session=[^;]+/.test(cookieHeader)
      if (!hasSession) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
      }
      // ponytail: cookie presence check only; full token validation happens in API route handlers.
      // Upgrade to JWT verification here when scaling to multi-instance.
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
