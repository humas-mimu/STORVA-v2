import { Request, Response, NextFunction } from 'express'
import { verifyAgentToken, hasScope } from '@storva/shared-auth'

export function authenticateToken(requiredScope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' })
    }

    const token = authHeader.substring(7)
    try {
      const payload = await verifyAgentToken(token)
      // Attach deviceId and scopes to request for use in route handlers
      req.deviceId = payload.deviceId
      req.scopes = payload.scopes

      // Check scope
      if (!hasScope(payload.scopes, requiredScope)) {
        return res.status(403).json({ error: 'Insufficient scope' })
      }

      next()
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
  }
}
