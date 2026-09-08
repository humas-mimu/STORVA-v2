'use client'

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar, RightPanel } from '@/components/dashboard'
import { useAuth } from '@/lib/auth'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import PdfViewer from '@/components/PdfViewer'
import {
  FolderOpen, Folder, FolderPlus, Upload, Search, Grid,
  List as ListIcon, ChevronRight, Download, Trash2, Edit2,
  FileText, Image as ImageIcon, Video, Music, Archive, File,
  X, Eye, RefreshCw, CheckCircle, AlertCircle, ArrowUpDown,
  HardDrive, ChevronDown, ArrowLeft, Lock, Unlock, Share2, Copy
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
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
  isPrivate?: boolean
}

type Volume = {
  id: number
  label: string
  storagePath: string
  enabled: boolean
  accessible: boolean
  error: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  // Clipboard API is unavailable on some HTTP/LAN origins. Use the legacy
  // textarea fallback so copying still works in local NAS deployments.
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    if (!document.execCommand('copy')) throw new Error('Copy command rejected')
  } finally {
    document.body.removeChild(textarea)
  }
}

function getItemIcon(item: FileItem, size = 24) {
  if (item.isFolder) return <Folder className="text-amber-500 fill-amber-100" size={size} />
  switch (item.category) {
    case 'images': return <ImageIcon className="text-rose-500" size={size} />
    case 'videos': return <Video className="text-amber-500" size={size} />
    case 'audio': return <Music className="text-violet-500" size={size} />
    case 'archives': return <Archive className="text-emerald-500" size={size} />
    case 'documents': return <FileText className="text-blue-500" size={size} />
    default: return <File className="text-slate-400" size={size} />
  }
}

// ── Volume Switcher Dropdown ──────────────────────────────────────────────────
function VolumeSwitcher({
  volumes,
  activeVol,
  onChange,
}: {
  volumes: Volume[]
  activeVol: Volume | null
  onChange: (vol: Volume) => void
}) {
  const [open, setOpen] = useState(false)
  const accessible = volumes.filter((v) => v.accessible)

  if (accessible.length <= 1) return null // single volume — no switcher needed

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        <HardDrive size={15} />
        <span className="max-w-[120px] truncate">{activeVol?.label ?? 'Select volume'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5">
          {accessible.map((vol) => (
            <button
              key={vol.id}
              onClick={() => { onChange(vol); setOpen(false) }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${activeVol?.id === vol.id ? 'text-indigo-700 font-semibold' : 'text-slate-700'
                }`}
            >
              <HardDrive size={16} className={activeVol?.id === vol.id ? 'text-indigo-600' : 'text-slate-400'} />
              <div className="min-w-0">
                <p className="font-medium truncate">{vol.label}</p>
                <p className="text-xs text-slate-400 font-mono truncate">{vol.storagePath}</p>
              </div>
              {activeVol?.id === vol.id && (
                <CheckCircle size={14} className="ml-auto shrink-0 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────
function FilesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const currentPath = searchParams.get('path') || ''
  const categoryFilter = searchParams.get('category') || ''
  const volParam = searchParams.get('vol') // numeric volume id from URL

  // ── Volumes ────────────────────────────────────────────────────────────────
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [activeVol, setActiveVol] = useState<Volume | null>(null)
  const [volLoadError, setVolLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let retryTimer: NodeJS.Timeout | null = null

    async function fetchVolumes(attempt = 1) {
      if (cancelled) return
      try {
        const r = await fetch('/api/agent/volumes', { signal: AbortSignal.timeout(7_000) })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (cancelled) return

        const accessible: Volume[] = (data.volumes ?? []).filter((v: Volume) => v.accessible)
        setVolumes(accessible)
        setVolLoadError(false)

        // Restore from URL param, else keep current, else first accessible
        if (volParam) {
          const found = accessible.find((v) => String(v.id) === volParam)
          setActiveVol(found ?? accessible[0] ?? null)
        } else {
          setActiveVol((prev) => prev ?? accessible[0] ?? null)
        }
      } catch {
        if (cancelled) return
        // Agent may still be starting — retry up to 5x with backoff (2s, 4s, 6s…)
        if (attempt <= 5) {
          setVolLoadError(true)
          retryTimer = setTimeout(() => fetchVolumes(attempt + 1), attempt * 2000)
        }
        // Don't wipe existing volumes/activeVol on failure so page stays usable
      }
    }

    fetchVolumes()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, []) // only on mount

  const handleVolumeChange = (vol: Volume) => {
    setActiveVol(vol)
    const params = new URLSearchParams()
    params.set('vol', String(vol.id))
    router.push(`/files?${params.toString()}`)
  }

  // ── File listing ───────────────────────────────────────────────────────────
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy] = useState<'name' | 'size' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modals
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [newName, setNewName] = useState('')
  const [deletingItem, setDeletingItem] = useState<FileItem | null>(null)
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null)

  // Privacy
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [privacyItem, setPrivacyItem] = useState<FileItem | null>(null)
  const [privacyUsers, setPrivacyUsers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; username: string }>>([])
  const [privacyEnabled, setPrivacyEnabled] = useState(false)

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareItem, setShareItem] = useState<FileItem | null>(null)
  const [shareAccessType, setShareAccessType] = useState<'PUBLIC' | 'USER'>('PUBLIC')
  const [shareWithPasskey, setShareWithPasskey] = useState(false)
  const [sharePasskey, setSharePasskey] = useState('')
  const [generatedShareUrl, setGeneratedShareUrl] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  // Upload
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (user?.role?.toLowerCase() !== 'admin') return
    fetch('/api/admin/users').then((r) => r.ok ? r.json() : null).then((data) => {
      if (data?.users) setAvailableUsers(data.users.filter((u: any) => u.role?.toLowerCase() !== 'admin'))
    }).catch(() => {})
  }, [user])

  const openPrivacy = async (item: FileItem) => {
    setPrivacyItem(item)
    setPrivacyUsers([])
    setPrivacyEnabled(Boolean(item.isPrivate))
    setIsPrivacyModalOpen(true)
    try {
      const res = await fetch(`/api/admin/privacy?path=${encodeURIComponent(item.relativePath)}`)
      const data = await res.json()
      setPrivacyEnabled(Boolean(data.isPrivate))
      setPrivacyUsers(Array.isArray(data.userIds) ? data.userIds : [])
    } catch { showToast('Unable to load privacy settings', 'error') }
  }

  const openShareModal = (item: FileItem) => {
    setShareItem(item)
    setShareAccessType('PUBLIC')
    setShareWithPasskey(false)
    setSharePasskey('')
    setGeneratedShareUrl('')
    setIsShareModalOpen(true)
  }

  const handleGenerateShareLink = async () => {
    if (!shareItem) return
    setIsSharing(true)
    try {
      // Dapatkan fileId via API metadata atau buat session
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: shareItem.relativePath, // handler fallback ke path jika id belum terpetakan
          accessType: shareAccessType,
          password: shareWithPasskey ? sharePasskey : null,
          relativePath: shareItem.relativePath,
          isFolder: shareItem.isFolder,
          volumeId: activeVol?.id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat share link')
      setGeneratedShareUrl(data.shareUrl)
      try {
        await copyTextToClipboard(data.shareUrl)
        showToast('Link tersalin ke clipboard!')
      } catch {
        // The share was created successfully even when clipboard permission is
        // blocked (for example on insecure origins or by browser policy).
        showToast('Link berhasil dibuat. Salin link dari kolom di bawah.', 'success')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsSharing(false)
    }
  }

  const savePrivacy = async () => {
    if (!privacyItem) return
    try {
      const res = await fetch('/api/admin/privacy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: privacyItem.relativePath, isPrivate: privacyEnabled, userIds: privacyUsers }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save privacy')
      showToast(privacyEnabled ? 'Private access updated' : 'Privacy removed')
      setIsPrivacyModalOpen(false)
      loadFiles()
    } catch (err: any) { showToast(err.message, 'error') }
  }


  // PhotoSwipe launcher
  const imageItems = useMemo(() => items.filter((i) => !i.isFolder && i.category === 'images'), [items])

  const openPhotoSwipe = async (targetItem: FileItem) => {
    const startIndex = imageItems.findIndex((i) => i.relativePath === targetItem.relativePath)

    // Load dimension asli
    const dataSource = await Promise.all(imageItems.map(async (img) => {
      const src = addVolParam(`/api/agent/preview?path=${encodeURIComponent(img.relativePath)}`)
      const dim = await new Promise<{ w: number, h: number }>((resolve) => {
        const i = new Image()
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight })
        i.onerror = () => resolve({ w: 1600, h: 1200 }) // fallback
        i.src = src
      })
      return { src, w: dim.w, h: dim.h, alt: img.name }
    }))

    const lightbox = new PhotoSwipeLightbox({
      dataSource,
      pswpModule: () => import('photoswipe'),
    })


    lightbox.init()
    lightbox.loadAndOpen(startIndex >= 0 ? startIndex : 0)
  }


  // Click file handler
  const handleItemClick = (item: FileItem) => {
    if (item.isFolder) {
      navigateToFolder(item.relativePath)
      return
    }

    if (item.category === 'images') {
      openPhotoSwipe(item)
      return
    }

    setPreviewItem(item)
  }

  // Build vol query string helper
  const volQS = activeVol ? `vol=${activeVol.id}` : ''
  const addVolParam = (base: string) => base + (volQS ? (base.includes('?') ? `&${volQS}` : `?${volQS}`) : '')

  // ── Load files ─────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!activeVol) return
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      query.set('vol', String(activeVol.id))
      if (currentPath) query.set('path', currentPath)

      const res = await fetch(`/api/agent/files?${query.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load files (HTTP ${res.status})`)
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Storage Drive')
    } finally {
      setLoading(false)
    }
  }, [activeVol, currentPath])

  const handleBack = useCallback(() => {
    const parts = currentPath.split(/[/\\]/).filter(Boolean)
    if (parts.length === 0) return
    const parentPath = parts.slice(0, -1).join('/')
    navigateToFolder(parentPath)
  }, [currentPath, activeVol])

  useEffect(() => { loadFiles() }, [loadFiles])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigateToFolder = (folderRelativePath: string) => {
    const params = new URLSearchParams()
    if (activeVol) params.set('vol', String(activeVol.id))
    if (folderRelativePath) params.set('path', folderRelativePath)
    router.push(`/files?${params.toString()}`)
  }

  // Breadcrumbs
  const breadcrumbs = React.useMemo(() => {
    const parts = currentPath.split(/[/\\]/).filter(Boolean)
    const crumbs = [{ name: activeVol?.label ?? 'Home', path: '' }]
    let accumulated = ''
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part
      crumbs.push({ name: part, path: accumulated })
    }
    return crumbs
  }, [currentPath, activeVol])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    try {
      const res = await fetch(addVolParam('/api/agent/folder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: currentPath, folderName: newFolderName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create folder')
      showToast(`Folder "${newFolderName}" created`)
      setNewFolderName('')
      setIsNewFolderOpen(false)
      loadFiles()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingItem || !newName.trim()) return
    try {
      const res = await fetch(addVolParam('/api/agent/rename'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: renamingItem.relativePath, newName: newName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to rename')
      showToast(`Renamed to "${newName.trim()}"`)
      setRenamingItem(null)
      setNewName('')
      loadFiles()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      const res = await fetch(addVolParam('/api/agent/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: deletingItem.relativePath }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete')
      showToast(`"${deletingItem.name}" moved to Trash`)
      setDeletingItem(null)
      loadFiles()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(fileList).forEach((f) => formData.append('files', f))
      const query = new URLSearchParams()
      if (activeVol) query.set('vol', String(activeVol.id))
      if (currentPath) query.set('path', currentPath)
      const res = await fetch(`/api/agent/upload?${query.toString()}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed')
      showToast(`Successfully uploaded ${fileList.length} file(s)`)
      loadFiles()
    } catch (err: any) { showToast(err.message, 'error') }
    finally { setIsUploading(false) }
  }

  // ── Filter & Sort ──────────────────────────────────────────────────────────
  const filteredItems = items
    .filter((item) => {
      if (categoryFilter && !item.isFolder && item.category !== categoryFilter) return false
      if (searchQuery.trim()) return item.name.toLowerCase().includes(searchQuery.toLowerCase())
      return true
    })
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'size') cmp = a.size - b.size
      else cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
      return sortOrder === 'asc' ? cmp : -cmp
    })

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6"
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-indigo-600/20 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-3xl bg-white p-8 shadow-2xl ring-4 ring-indigo-500/30">
            <Upload size={48} className="animate-bounce text-indigo-600" />
            <p className="mt-4 text-lg font-bold text-slate-700">Drop files here to upload</p>
          </div>
        </div>
      )}

      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />

        <section className="flex-1 min-h-0 flex flex-col space-y-5 overflow-y-auto p-4 md:p-0 md:h-full">
          {/* Header */}
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="text-indigo-600" size={24} />
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Files & Folders</h1>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {activeVol
                  ? `Browsing: ${activeVol.storagePath}`
                  : 'No active storage volume'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              {user && (
                <>
                  <button
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    disabled={isUploading || !activeVol}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={() => setIsNewFolderOpen(true)}
                    disabled={!activeVol}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FolderPlus size={16} className="text-indigo-600" />
                    New Folder
                  </button>
                </>
              )}

              <button
                onClick={loadFiles}
                title="Refresh"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          {/* Breadcrumb + controls */}
          <div className="sticky top-[88px] z-10 flex flex-col gap-3 rounded-[1.25rem] bg-white/95 backdrop-blur-md p-4 shadow-sm ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              {currentPath && (
                <button
                  onClick={handleBack}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  title="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <VolumeSwitcher volumes={volumes} activeVol={activeVol} onChange={handleVolumeChange} />
              <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <React.Fragment key={crumb.path}>
                    {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
                    <button
                      onClick={() => navigateToFolder(crumb.path)}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${isLast
                          ? 'bg-indigo-50 font-bold text-indigo-700'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                    >
                      {idx === 0 ? <HardDrive size={14} /> : null}
                      {crumb.name}
                    </button>
                  </React.Fragment>
                )
              })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-56">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <ArrowUpDown size={14} />
              </button>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg p-1.5 transition ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* File listing */}
          <div className="flex-1 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            {!activeVol ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <HardDrive size={40} className="text-slate-300" />
                <p className="text-base font-semibold text-slate-600">No storage volume configured</p>
                <p className="text-xs">Go to Settings → Storage to add a volume</p>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Reading files from {activeVol.label}...</p>
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-rose-500">
                <AlertCircle size={36} />
                <p className="text-base font-semibold">{error}</p>
                <button onClick={loadFiles} className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                  Retry
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <FolderOpen size={44} className="text-slate-300" />
                <p className="text-base font-semibold text-slate-600">This folder is empty</p>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Upload size={14} /> Upload File
                  </button>
                  <button
                    onClick={() => setIsNewFolderOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FolderPlus size={14} /> New Folder
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.relativePath || item.name}
                    onDoubleClick={() => handleItemClick(item)}
                    className="group relative flex flex-col justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div onClick={() => handleItemClick(item)} className="cursor-pointer">
                        {getItemIcon(item)}
                      </div>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        {!item.isFolder && (
                          <a
                            href={addVolParam(`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`)}
                            download={item.name}
                            title="Download"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {user && (
                          <button
                            onClick={() => openShareModal(item)}
                            title="Share link"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Share2 size={14} />
                          </button>
                        )}
                        {user?.role?.toLowerCase() === 'admin' && (
                          <button
                            onClick={() => openPrivacy(item)}
                            title="Private access"
                            className={`rounded-lg p-1.5 hover:bg-indigo-50 ${item.isPrivate ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {user && (
                          <button
                            onClick={() => { setRenamingItem(item); setNewName(item.name) }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {user && (
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      onClick={() => handleItemClick(item)}
                      className="mt-3 cursor-pointer"
                    >
                      <p title={item.name} className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.isFolder ? 'Folder' : formatBytes(item.size)} • {formatDate(item.modifiedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <tr>
                      <th className="pb-3 pl-3">Name</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Modified</th>
                      <th className="pb-3 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr key={item.relativePath || item.name} className="group transition hover:bg-slate-50/80">
                        <td className="py-3 pl-3">
                          <div
                            onClick={() => handleItemClick(item)}
                            className="flex cursor-pointer items-center gap-3 font-medium text-slate-700 group-hover:text-indigo-600"
                          >
                            {getItemIcon(item, 20)}
                            <span className="truncate max-w-xs md:max-w-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500">{item.isFolder ? '-' : formatBytes(item.size)}</td>
                        <td className="py-3 text-xs capitalize text-slate-500">{item.category}</td>
                        <td className="py-3 text-xs text-slate-400">{formatDate(item.modifiedAt)}</td>
                        <td className="py-3 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!item.isFolder && (
                              <>
                                <button onClick={() => setPreviewItem(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Eye size={15} /></button>
                                <a
                                  href={addVolParam(`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`)}
                                  download={item.name}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                >
                                  <Download size={15} />
                                </a>
                              </>
                            )}
                            {user && (
                              <button onClick={() => openShareModal(item)} title="Share link" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                                <Share2 size={15} />
                              </button>
                            )}
                            {user?.role?.toLowerCase() === 'admin' && (
                              <button onClick={() => openPrivacy(item)} title="Private access" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                                <Lock size={15} />
                              </button>
                            )}
                            {user && (
                              <button onClick={() => { setRenamingItem(item); setNewName(item.name) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Edit2 size={15} /></button>
                            )}
                            {user && (
                              <button onClick={() => setDeletingItem(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                            )}
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

      {/* NEW FOLDER MODAL */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><FolderPlus className="text-indigo-600" size={22} /><h3 className="text-lg font-bold text-slate-800">Create New Folder</h3></div>
              <button onClick={() => setIsNewFolderOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Folder Name</label>
                <input autoFocus type="text" placeholder="e.g. Invoices 2026" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewFolderOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={!newFolderName.trim()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Edit2 className="text-indigo-600" size={22} /><h3 className="text-lg font-bold text-slate-800">Rename</h3></div>
              <button onClick={() => setRenamingItem(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleRename} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">New Name</label>
                <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRenamingItem(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={!newName.trim()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Move to Trash?</h3>
                <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{deletingItem.name}</span></p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">This item will be moved to Trash. You can restore it later from Trash.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeletingItem(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleDelete} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {isShareModalOpen && shareItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="text-indigo-600" size={22} />
                <h3 className="text-lg font-bold text-slate-800">Share Item</h3>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 truncate text-xs text-slate-500">{shareItem.name}</p>

            {shareItem.isPrivate ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                ⚠️ Item ini berstatus <strong>Private</strong>. Hanya Admin dan User yang diizinkan yang dapat mengaksesnya meskipun mempunyai link share.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Akses Share</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareAccessType('PUBLIC')}
                      className={`rounded-xl p-3 text-left text-xs font-semibold transition ${
                        shareAccessType === 'PUBLIC'
                          ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🌐 Publik
                      <p className="mt-0.5 text-[10px] font-normal text-slate-400">Siapa saja bisa lihat</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareAccessType('USER')}
                      className={`rounded-xl p-3 text-left text-xs font-semibold transition ${
                        shareAccessType === 'USER'
                          ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🔒 User (Harus Login)
                      <p className="mt-0.5 text-[10px] font-normal text-slate-400">Wajib login akun</p>
                    </button>
                  </div>
                </div>

                {shareAccessType === 'PUBLIC' && (
                  <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={shareWithPasskey}
                        onChange={(e) => setShareWithPasskey(e.target.checked)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      Gunakan Passkey
                    </label>

                    {shareWithPasskey && (
                      <input
                        type="password"
                        placeholder="Set Passkey..."
                        value={sharePasskey}
                        onChange={(e) => setSharePasskey(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {generatedShareUrl && (
              <div className="mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link Hasil Share</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedShareUrl}
                    className="w-full bg-transparent text-xs text-slate-700 outline-none"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await copyTextToClipboard(generatedShareUrl)
                        showToast('Link tersalin!')
                      } catch {
                        showToast('Browser memblokir clipboard. Salin link secara manual dari kolom.')
                      }
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsShareModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Tutup
              </button>
              <button
                onClick={handleGenerateShareLink}
                disabled={isSharing || (shareAccessType === 'PUBLIC' && shareWithPasskey && !sharePasskey.trim())}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSharing ? 'Generating...' : 'Buat & Salin Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY MODAL */}
      {isPrivacyModalOpen && privacyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Lock className="text-indigo-600" size={22} /><h3 className="text-lg font-bold text-slate-800">Private access</h3></div>
              <button onClick={() => setIsPrivacyModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <p className="mt-2 truncate text-xs text-slate-500">{privacyItem.relativePath}</p>
            <label className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={privacyEnabled} onChange={(e) => setPrivacyEnabled(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Make this {privacyItem.isFolder ? 'folder and all children' : 'file'} private
            </label>
            {privacyEnabled && <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allowed users</p>
              {availableUsers.length === 0 ? <p className="text-sm text-slate-400">No user accounts available.</p> : availableUsers.map((candidate) => (
                <label key={candidate.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={privacyUsers.includes(candidate.id)} onChange={() => setPrivacyUsers((current) => current.includes(candidate.id) ? current.filter((id) => id !== candidate.id) : [...current, candidate.id])} className="h-4 w-4 accent-indigo-600" />
                  <span className="text-sm text-slate-700">{candidate.username}</span>
                </label>
              ))}
            </div>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsPrivacyModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={savePrivacy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                {getItemIcon(previewItem)}
                <div>
                  <h3 className="text-base font-bold text-slate-800">{previewItem.name}</h3>
                  <p className="text-xs text-slate-400">{formatBytes(previewItem.size)} • {previewItem.mimeType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={addVolParam(`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`)}
                  download={previewItem.name}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  <Download size={14} /> Download
                </a>
                <button onClick={() => setPreviewItem(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-950/5 p-6 min-h-[500px]">
              {previewItem.category === 'images' ? (
                <div className="flex items-center justify-center">
                  <p className="text-sm text-slate-500">Image opening in viewer...</p>
                </div>
              ) : previewItem.mimeType === 'application/pdf' || previewItem.name.toLowerCase().endsWith('.pdf') ? (
                <PdfViewer
                  src={addVolParam(`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`)}
                  fileName={previewItem.name}
                  className="w-full"
                />
              ) : previewItem.category === 'videos' ? (
                <video controls autoPlay
                  src={addVolParam(`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`)}
                  className="max-h-[65vh] max-w-full rounded-xl shadow-md"
                />
              ) : previewItem.category === 'audio' ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-md">
                  <Music size={48} className="text-indigo-600" />
                  <p className="font-semibold text-slate-700">{previewItem.name}</p>
                  <audio controls autoPlay
                    src={addVolParam(`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`)}
                    className="w-80"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-10 text-center shadow-md">
                  {getItemIcon(previewItem)}
                  <div>
                    <h4 className="font-semibold text-slate-800">{previewItem.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">Preview not available for this format.</p>
                  </div>
                  <a
                    href={addVolParam(`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`)}
                    download={previewItem.name}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
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

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-indigo-600" size={32} /></div>}>
      <FilesContent />
    </Suspense>
  )
}