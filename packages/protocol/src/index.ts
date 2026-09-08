export type TransportMode = 'local' | 'remote'

export interface StorageTransport {
  list(path?: string): Promise<unknown>
  upload(file: unknown, path: string): Promise<unknown>
  download(fileId: string): Promise<Response>
  delete(fileId: string): Promise<void>
}

export interface SignedConnectionSession {
  token: string
  deviceId: string
  scopes: Array<'storage:read' | 'storage:write' | 'storage:delete' | 'storage:share'>
  expiresAt: number
}
