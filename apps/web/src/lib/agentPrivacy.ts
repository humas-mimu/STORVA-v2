import { repository } from '@/lib/repository'

// ── Privacy helpers ───────────────────────────────────────────────────────────
// Shared by the agent proxy (app/api/agent/[...agentPath]/route.ts) and the
// direct-upload token endpoint (app/api/agent/upload-token/route.ts), so a
// path can never be judged "hidden" differently depending on which route
// happens to check it.

export function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

export async function getPrivacyDecisions(userId: string | null) {
  let isAdmin = false
  if (userId) {
    const u: any = await repository.user.findUnique({ where: { id: userId } }).catch(() => null)
    isAdmin = u?.role?.toLowerCase() === 'admin'
  }
  const rules: any[] = await repository.privacyRule.findMany({}).catch(() => [])
  return { isAdmin, rules }
}

export function isPathHidden(targetPath: string, userId: string | null, isAdmin: boolean, rules: any[]) {
  if (isAdmin) return false
  const target = normalizePath(targetPath)
  if (!target) return false

  // Sort by specificity: deepest path rule wins, otherwise any ancestor privacy applies
  const matchedRules = rules
    .filter((r) => {
      const rulePath = normalizePath(r.relativePath)
      return target === rulePath || target.startsWith(`${rulePath}/`)
    })
    .sort((a, b) => normalizePath(b.relativePath).length - normalizePath(a.relativePath).length)

  if (matchedRules.length === 0) return false
  const rule = matchedRules[0]
  if (!rule.isPrivate) return false
  if (!userId) return true

  const allowed: string[] = JSON.parse(rule.allowedUsers || '[]')
  return !allowed.includes(userId)
}
