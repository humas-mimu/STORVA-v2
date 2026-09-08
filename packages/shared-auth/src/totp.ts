import * as speakeasy from 'speakeasy'
import { z } from 'zod'

export const TOTPSetupSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
})

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret (base32) and an otpauth URL that can be rendered as QR code.
 */

export function generateTOTPSecret(label: string, issuer = 'Storva'): z.infer<typeof TOTPSetupSchema> {
  const secret = speakeasy.generateSecret({ length: 20, name: label, issuer })
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!,
  }
}

/** Verify a TOTP token against a stored base32 secret */
export function verifyTOTP(token: string, base32secret: string): boolean {
  return speakeasy.totp.verify({
    secret: base32secret,
    encoding: 'base32',
    token,
    window: 1,
  })
}
