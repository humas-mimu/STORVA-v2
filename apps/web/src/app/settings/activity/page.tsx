'use client'

import { Sidebar, RightPanel } from '@/components/dashboard'
import { Activity as ActivityIcon, FileText, FolderOpen, Upload, Trash2, Share2, RefreshCw, Download, LockKeyhole, UnlockKeyhole } from 'lucide-react'
import { useState, useEffect } from 'react'

type Activity = {
  id: string
  userId: string
  username?: string
  action: string
  fileId: string | null
  metadata: string | null
  createdAt: string
  file?: { name: string; relativePath: string; isFolder: boolean } | null
  user?: { username: string } | null
}

function actionLabel(action: string) {
  switch (action) {
    case 'folder:create': return { label: 'Created folder', color: 'text-amber-600 bg-amber-50', icon: FolderOpen }
    case 'file:rename':   return { label: 'Renamed file', color: 'text-blue-600 bg-blue-50', icon: FileText }
    case 'file:delete':   return { label: 'Deleted file', color: 'text-rose-600 bg-rose-50', icon: Trash2 }
    case 'file:upload':   return { label: 'Uploaded file', color: 'text-emerald-600 bg-emerald-50', icon: Upload }
    case 'file:download': return { label: 'Downloaded file', color: 'text-cyan-600 bg-cyan-50', icon: Download }
    case 'share:create':      return { label: 'Shared file', color: 'text-violet-600 bg-violet-50', icon: Share2 }
    case 'privacy:enable':   return { label: 'Made private', color: 'text-indigo-600 bg-indigo-50', icon: LockKeyhole }
    case 'privacy:disable':  return { label: 'Removed privacy', color: 'text-slate-600 bg-slate-100', icon: UnlockKeyhole }
    default:              return { label: action, color: 'text-slate-600 bg-slate-50', icon: ActivityIcon }
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ActivitySettingsPage() {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/activity?page=${page}&limit=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setItems(data.items || [])
        setTotal(data.total || 0)
      })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />
        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          <header className="sticky top-0 z-20 flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Activity Log</h1>
              <p className="mt-1 text-sm text-slate-500">View all file operations and system events.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ActivityIcon size={24} />
            </div>
          </header>

          <div className="rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200/70">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <ActivityIcon size={36} strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium">No activity yet</p>
                <p className="mt-1 text-xs text-slate-400">File operations will appear here.</p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {items.map((act) => {
                  const meta = (() => { try { return act.metadata ? JSON.parse(act.metadata) : {} } catch { return {} } })()
                  const path = act.file?.relativePath ?? meta.path ?? meta.filePath ?? ''
                  const fileName = act.file?.name ?? (typeof path === 'string' ? path.split(/[/\\]/).pop() ?? '' : '')
                  const { label, color, icon: Icon } = actionLabel(act.action)

                  let description = fileName
                  if (act.action === 'file:rename') {
                    description = `"${meta.oldName}" → "${meta.newName}" in "${meta.dirPath || '/'}"`
                  } else if (act.action === 'file:delete') {
                    description = `"${meta.fileName}" in "${meta.dirPath || '/'}"`
                  } else if (act.action === 'folder:create') {
                    description = `"${meta.folderName}" in "${meta.dirPath || '/'}"`
                  } else if (act.action === 'file:upload') {
                    const files = meta.fileNames?.join(', ') || 'file'
                    description = `${files} to "${meta.dirPath || '/'}"`
                  } else if (act.action === 'file:download') {
                    description = `"${fileName}" from "${meta.dirPath || '/'}"`
                  } else if (act.action === 'share:create') {
                    description = `"${meta.fileName}"`
                  }

                  return (
                    <li key={act.id} className="flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50/60">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          <span className="font-bold text-indigo-600">{act.user?.username || 'System'} </span>
                          {label}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{description}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-400">{formatTime(act.createdAt)}</span>
                    </li>
                  )
                })}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <span className="text-xs text-slate-400">
                  {total} {total === 1 ? 'event' : 'events'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
        <RightPanel />
      </div>
    </main>
  )
}
