'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Sidebar, RightPanel } from '@/components/dashboard'
import {
  Trash2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Folder,
  File,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'

type TrashItem = {
  trashName: string
  originalName: string
  isFolder: boolean
  size: number
  deletedAt: string
}

function formatBytes(bytes: number = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadTrash = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/trash')
      if (!res.ok) throw new Error('Failed to load trash items')
      const data = await res.json()
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message || 'Error loading trash')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const handleRestore = async (item: TrashItem) => {
    try {
      const res = await fetch('/api/agent/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trashName: item.trashName,
          restorePath: '',
        }),
      })

      if (!res.ok) throw new Error('Failed to restore item')
      showToast(`Restored "${item.originalName}" to root storage`)
      loadTrash()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch('/api/agent/trash/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trashName: itemToDelete.trashName,
        }),
      })

      if (!res.ok) throw new Error('Failed to delete item permanently')
      showToast(`Permanently deleted "${itemToDelete.originalName}"`)
      setItemToDelete(null)
      loadTrash()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleEmptyTrash = async () => {
    try {
      const res = await fetch('/api/agent/trash/empty', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to empty trash')
      showToast('Trash emptied successfully')
      setConfirmEmpty(false)
      loadTrash()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      {/* Action Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'
            }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />

        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          <header className="sticky top-0 z-20 flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="text-rose-600" size={24} />
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Trash</h1>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Items in trash can be restored or permanently deleted from disk
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                <Trash2 size={15} /> Empty Trash
              </button>
            )}
          </header>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Checking Trash...</p>
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-rose-500">
                <AlertCircle size={36} />
                <p className="text-base font-semibold">{error}</p>
                <button
                  onClick={loadTrash}
                  className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <Trash2 size={44} className="text-slate-300" />
                <p className="text-base font-semibold text-slate-600">Trash is empty</p>
                <p className="text-xs text-slate-400">Deleted files and folders will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <tr>
                      <th className="pb-3 pl-3">Original Name</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Deleted Date</th>
                      <th className="pb-3 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.trashName} className="group hover:bg-slate-50/80 transition">
                        <td className="py-3 pl-3 font-medium text-slate-700">
                          <div className="flex items-center gap-2.5">
                            {item.isFolder ? (
                              <Folder className="text-amber-500" size={18} />
                            ) : (
                              <File className="text-slate-400" size={18} />
                            )}
                            <span>{item.originalName}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          {item.isFolder ? 'Folder' : 'File'}
                        </td>
                        <td className="py-3 text-xs text-slate-500">{formatBytes(item.size)}</td>
                        <td className="py-3 text-xs text-slate-400">{formatDate(item.deletedAt)}</td>
                        <td className="py-3 pr-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestore(item)}
                              title="Restore file"
                              className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                            >
                              <RotateCcw size={13} /> Restore
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              title="Delete permanently"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <RightPanel />
      </div>

      {/* CONFIRM EMPTY MODAL */}
      {confirmEmpty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Empty Trash?</h3>
                <p className="text-xs text-slate-500">This will permanently delete all {items.length} item(s).</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              This action cannot be undone. Files will be permanently removed from disk storage.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Empty Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SINGLE DELETE */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete Permanently?</h3>
                <p className="text-xs text-slate-500">{itemToDelete.originalName}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
