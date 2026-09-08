import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { preparePersistentDatabase } from './persistentData'

// Minimal file-backed repository used when DATABASE_URL is intentionally omitted.
// The database lives outside the application source tree so source replacement or
// application upgrades cannot implicitly delete user state.
class MockPrismaClient {
  private dbPath: string
  private data: any

  constructor() {
    const prepared = preparePersistentDatabase()
    this.dbPath = prepared.databasePath
    this.data = prepared.data

    if (prepared.migratedFrom) {
      console.warn(`[STORVA] Migrated legacy development database from ${prepared.migratedFrom} to ${this.dbPath}`)
      if (prepared.backupPath) console.warn(`[STORVA] Legacy database backup: ${prepared.backupPath}`)
    }
    if (prepared.backupPath) {
      console.warn(`[STORVA] Database migration backup: ${prepared.backupPath}`)
    }
  }

  private save() {
    this.data._meta = {
      ...(this.data._meta || {}),
      formatVersion: 1,
      appId: 'storva',
      updatedAt: new Date().toISOString(),
    }

    const serialized = JSON.stringify(
      this.data,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    )
    const tempPath = `${this.dbPath}.tmp-${process.pid}-${Date.now()}`
    fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', flag: 'wx' })
    try {
      fs.rmSync(this.dbPath, { force: true })
      fs.renameSync(tempPath, this.dbPath)
    } catch (error) {
      fs.rmSync(tempPath, { force: true })
      throw error
    }
  }

  private createModel(modelName: string) {
    const getCollection = () => {
      if (!Array.isArray(this.data[modelName])) this.data[modelName] = []
      return this.data[modelName] as any[]
    }

    const matchesWhere = (item: any, where: any): boolean => {
      if (!where || Object.keys(where).length === 0) return true
      if (Array.isArray(where.OR)) return where.OR.some((condition: any) => matchesWhere(item, condition))
      if (Array.isArray(where.AND)) return where.AND.every((condition: any) => matchesWhere(item, condition))

      return Object.entries(where).every(([key, value]) => {
        if (key === 'OR' || key === 'AND') return true
        const actual = item[key]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('gte' in value && !(new Date(actual).getTime() >= new Date((value as any).gte).getTime())) return false
          if ('lte' in value && !(new Date(actual).getTime() <= new Date((value as any).lte).getTime())) return false
          if ('gt' in value && !(new Date(actual).getTime() > new Date((value as any).gt).getTime())) return false
          if ('lt' in value && !(new Date(actual).getTime() < new Date((value as any).lt).getTime())) return false
          if ('contains' in value && !String(actual ?? '').includes(String((value as any).contains))) return false
          return true
        }
        return actual === value
      })
    }

    return {
      create: async ({ data }: any) => {
        const id = (crypto.randomUUID as () => string)()
        const now = new Date().toISOString()
        const newItem = { ...data, id, createdAt: data.createdAt ?? now, updatedAt: data.updatedAt ?? now }
        getCollection().push(newItem)
        this.save()
        return newItem
      },
      findUnique: async ({ where }: any) => {
        return getCollection().find((item: any) => matchesWhere(item, where)) || null
      },
      findFirst: async ({ where, include }: any) => {
        const item = getCollection().find((entry: any) => matchesWhere(entry, where))
        if (!item) return null
        if (include) {
          const result: any = { ...item }
          for (const [rel] of Object.entries(include)) result[rel] = []
          return result
        }
        return item
      },
      findMany: async ({ where, orderBy, take, skip, include }: any = {}) => {
        let items = [...getCollection()].filter((item: any) => matchesWhere(item, where))
        if (orderBy) {
          const [key, direction] = Object.entries(orderBy)[0] as [string, string]
          items.sort((a: any, b: any) => {
            const av = a[key] instanceof Date ? a[key].getTime() : new Date(a[key]).getTime()
            const bv = b[key] instanceof Date ? b[key].getTime() : new Date(b[key]).getTime()
            if (Number.isNaN(av) || Number.isNaN(bv)) {
              return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (direction === 'asc' ? 1 : -1)
            }
            return direction === 'asc' ? av - bv : bv - av
          })
        }
        if (skip) items = items.slice(skip)
        if (take) items = items.slice(0, take)
        if (include) {
          items = items.map((item: any) => {
            const result = { ...item }
            if (include.user && modelName === 'activities') {
              const user = this.data.users?.find((u: any) => u.id === item.userId)
              result.user = user ? { username: user.username } : null
            }
            if (include.file && modelName === 'activities') {
              const file = this.data.file_metadata?.find((f: any) => f.id === item.fileId)
              result.file = file ? { name: file.name, relativePath: file.relativePath, isFolder: file.isFolder } : null
            }
            return result
          })
        }
        return items
      },
      update: async ({ where, data }: any) => {
        const collection = getCollection()
        const idx = collection.findIndex((item: any) => matchesWhere(item, where))
        if (idx === -1) throw new Error('Record not found')
        collection[idx] = { ...collection[idx], ...data, updatedAt: new Date().toISOString() }
        this.save()
        return collection[idx]
      },
      count: async () => getCollection().length,
      delete: async ({ where }: any) => {
        const collection = getCollection()
        const idx = collection.findIndex((item: any) => matchesWhere(item, where))
        if (idx === -1) throw new Error('Record not found')
        const deleted = collection.splice(idx, 1)[0]
        this.save()
        return deleted
      },
    }
  }

  get user() { return this.createModel('users') }
  get session() { return this.createModel('sessions') }
  get device() { return this.createModel('devices') }
  get fileMetadata() { return this.createModel('file_metadata') }
  get activity() { return this.createModel('activities') }
  get uploadSession() { return this.createModel('upload_sessions') }
  get downloadSession() { return this.createModel('download_sessions') }
  get shareLink() { return this.createModel('share_links') }
  get privacyRule() { return this.createModel('privacy_rules') }
}

const globalForPrisma = globalThis as unknown as { prisma: any }

export const prisma = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : (globalForPrisma.prisma ?? new MockPrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
