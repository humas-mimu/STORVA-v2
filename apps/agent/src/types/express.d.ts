import 'express'
import type { Scope } from '@storva/shared-auth'

declare global {
  namespace Express {
    interface Request {
      deviceId?: string
      scopes?: Scope
    }
  }
}

export {}
