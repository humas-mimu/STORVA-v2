import { prisma } from './prisma'

// ponytail: thin facade today; add per-model methods when business rules grow.
export const repository = {
  user: prisma.user,
  session: prisma.session,
  device: prisma.device,
  fileMetadata: prisma.fileMetadata,
  activity: prisma.activity,
  uploadSession: prisma.uploadSession,
  downloadSession: prisma.downloadSession,
  shareLink: prisma.shareLink,
  privacyRule: prisma.privacyRule,
}

export type Repository = typeof repository
