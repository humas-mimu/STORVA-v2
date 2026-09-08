'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar, RightPanel } from '@/components/dashboard'
import {
  Clock,
  RefreshCw,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  X,
  AlertCircle,
} from 'lucide-react'

type FileItem = {
  name: string
  relativePath: string
  isFolder: boolean
  size: number
  mimeType: string
  category: string
  extension: string
  modifiedAt: string
  createdAt: string
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

function getItemIcon(item: FileItem) {
  switch (item.category) {
    case 'images':
      return <ImageIcon className="text-rose-500" size={22} />
    case 'videos':
      return <Video className="text-amber-500" size={22} />
    case 'audio':
      return <Music className="text-violet-500" size={22} />
    case 'archives':
      return <Archive className="text-emerald-500" size={22} />
    case 'documents':
      return <FileText className="text-blue-500" size={22} />
    default:
      return <File className="text-slate-400" size={22} />
  }
}

export default function RecentPage() {
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null)

  const loadRecent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/files')
      if (!res.ok) throw new Error('Failed to load recent files')
      const data = await res.json()
      const onlyFiles = (data.items || [])
        .filter((i: FileItem) => !i.isFolder)
        .sort((a: FileItem, b: FileItem) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      setItems(onlyFiles)
    } catch (err: any) {
      setError(err.message || 'Error fetching recent files')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />

        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          <header className="sticky top-0 z-20 flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="text-indigo-600" size={24} />
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Recent Files</h1>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Recently created and modified files on your storage drive
              </p>
            </div>
            <button
              onClick={loadRecent}
              title="Refresh"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Loading recent files...</p>
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-rose-500">
                <AlertCircle size={36} />
                <p className="text-base font-semibold">{error}</p>
                <button
                  onClick={loadRecent}
                  className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <Clock size={44} className="text-slate-300" />
                <p className="text-base font-semibold text-slate-600">No recent files</p>
                <p className="text-xs text-slate-400">Files uploaded or modified will appear here</p>
                <Link
                  href="/files"
                  className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Go to Files
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <tr>
                      <th className="pb-3 pl-3">Name</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Last Modified</th>
                      <th className="pb-3 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.relativePath || item.name} className="group hover:bg-slate-50/80 transition">
                        <td className="py-3 pl-3 font-medium text-slate-700">
                          <div
                            onClick={() => setPreviewItem(item)}
                            className="flex cursor-pointer items-center gap-3 group-hover:text-indigo-600"
                          >
                            {getItemIcon(item)}
                            <span className="truncate max-w-xs md:max-w-md">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500">{formatBytes(item.size)}</td>
                        <td className="py-3 text-xs capitalize text-slate-500">{item.category}</td>
                        <td className="py-3 text-xs text-slate-400">{formatDate(item.modifiedAt)}</td>
                        <td className="py-3 pr-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewItem(item)}
                              title="Preview"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Eye size={15} />
                            </button>
                            <a
                              href={`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`}
                              download={item.name}
                              title="Download"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Download size={15} />
                            </a>
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

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                {getItemIcon(previewItem)}
                <div>
                  <h3 className="text-base font-bold text-slate-800">{previewItem.name}</h3>
                  <p className="text-xs text-slate-400">
                    {formatBytes(previewItem.size)} • {previewItem.mimeType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`}
                  download={previewItem.name}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-950/5 p-6 min-h-[300px]">
              {previewItem.category === 'images' ? (
                <img
                  src={`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`}
                  alt={previewItem.name}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : previewItem.category === 'videos' ? (
                <video
                  controls
                  autoPlay
                  src={`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`}
                  className="max-h-[65vh] max-w-full rounded-xl shadow-md"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-10 text-center shadow-md">
                  {getItemIcon(previewItem)}
                  <div>
                    <h4 className="font-semibold text-slate-800">{previewItem.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">Preview not available for this format.</p>
                  </div>
                  <a
                    href={`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`}
                    download={previewItem.name}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
                  >
                    <Download size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
