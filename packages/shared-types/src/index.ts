export type FileCategory = 'documents' | 'images' | 'videos' | 'audio' | 'archives' | 'others'

export interface FileItem {
  id: string
  name: string
  relativePath: string
  size: bigint
  mimeType: string
  extension: string
  isFolder: boolean
  isFavorite: boolean
  isDeleted: boolean
  checksum?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  parentId?: string
  deviceId: string
  userId: string
}

export interface DeviceInfo {
  id: string
  deviceName: string
  agentVersion: string
  lastSeen: Date
  isOnline: boolean
}

export interface StorageStats {
  totalBytes: bigint
  usedBytes: bigint
  freeBytes: bigint
  percentUsed: number
  byCategory: Record<FileCategory, bigint>
}

export interface AgentHeartbeat {
  deviceId: string
  version: string
  status: 'online' | 'degraded'
  timestamp: number
  storageStats?: Pick<StorageStats, 'totalBytes' | 'usedBytes' | 'freeBytes'>
}

export interface RealtimeEvent {
  type:
    | 'agent.online'
    | 'agent.offline'
    | 'file.uploaded'
    | 'file.deleted'
    | 'file.changed'
    | 'storage.warning'
    | 'storage.critical'
  payload?: unknown
}

export type ConnectionMode = 'local' | 'remote' | 'offline'
