'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar, RightPanel } from '@/components/dashboard'
import {
  HardDrive, Plus, Trash2, Power, PowerOff, RefreshCw,
  CheckCircle2, AlertCircle, Edit2, X, Save, Info,
} from 'lucide-react'

const MAX_VOLUMES = 8

interface Volume {
  id: number
  label: string
  storagePath: string
  enabled: boolean
  accessible: boolean
  error: string | null
  disk?: { totalBytes: number; freeBytes: number; usedBytes: number } | null
}

function formatBytes(bytes: number = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function pct(used = 0, total = 1) {
  return Math.min(100, Math.round((used / total) * 100))
}

export default function StorageSettingsPage() {
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [loading, setLoading] = useState(true)
  const [agentOnline, setAgentOnline] = useState(false)

  // Add volume form
  const [showAdd, setShowAdd] = useState(false)
  const [addPath, setAddPath] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Inline rename
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchVolumes = async (attempt = 1) => {
    if (attempt === 1) setLoading(true)
    // Give the agent much more room on the first load — a fresh chokidar
    // scan of a large/whole-drive storage root can keep the agent's event
    // loop busy for a while, making /health briefly slow to respond. We'd
    // rather keep polling patiently than flash a false "offline" banner.
    const MAX_ATTEMPTS = 15
    try {
      // /api/connection/health hits agent /health directly — no auth needed, fast
      const healthRes = await fetch('/api/connection/health', { signal: AbortSignal.timeout(6_000) })
      const health = healthRes.ok ? await healthRes.json() : { status: 'offline' }
      const online = health.status === 'online' || health.status === 'degraded'
      setAgentOnline(online)

      if (!online) {
        // Agent not reachable yet — retry (agent may still be booting or
        // doing its initial full-volume file scan).
        if (attempt <= MAX_ATTEMPTS) {
          setTimeout(() => fetchVolumes(attempt + 1), Math.min(attempt * 2000, 10_000))
        } else {
          setVolumes([])
          setLoading(false)
        }
        return
      }

      const healthVols: any[] = health?.agent?.volumes ?? []
      const diskMap = new Map(healthVols.map((v: any) => [v.id, v.disk]))

      const volRes = await fetch('/api/agent/volumes', { signal: AbortSignal.timeout(7_000) })
      if (!volRes.ok) {
        console.error('Failed to load volumes:', volRes.status)
        setVolumes([])
        setLoading(false)
        return
      }
      const volData = await volRes.json()
      const merged: Volume[] = (volData.volumes ?? []).map((v: any) => ({
        ...v,
        disk: diskMap.get(v.id) ?? null,
      }))
      setVolumes(merged)
    } catch (err: any) {
      if (attempt <= MAX_ATTEMPTS) {
        setTimeout(() => fetchVolumes(attempt + 1), Math.min(attempt * 2000, 10_000))
        return
      }
      setAgentOnline(false)
      setVolumes([])
    } finally {
      if (attempt === 1 || attempt > MAX_ATTEMPTS) setLoading(false)
    }
  }

  useEffect(() => { fetchVolumes() }, [])

  // ── Toggle enabled ──────────────────────────────────────────────────────────
  const handleToggle = async (vol: Volume) => {
    try {
      const res = await fetch(`/api/agent/volumes/${vol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !vol.enabled }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`"${vol.label}" ${!vol.enabled ? 'enabled' : 'disabled'}`)
      fetchVolumes()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // ── Remove volume ───────────────────────────────────────────────────────────
  const handleRemove = async (vol: Volume) => {
    if (!confirm(`Remove volume "${vol.label}"?\nThis only removes it from Storva — no files will be deleted.`)) return
    try {
      const res = await fetch(`/api/agent/volumes/${vol.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`"${vol.label}" removed`)
      fetchVolumes()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // ── Rename / relabel ────────────────────────────────────────────────────────
  const handleRelabel = async (id: number) => {
    if (!editLabel.trim()) return
    try {
      const res = await fetch(`/api/agent/volumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Label updated')
      setEditingId(null)
      fetchVolumes()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // ── Add volume ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddError(null)
    if (!addPath.trim()) { setAddError('Path is required'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/agent/volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: addPath.trim(), label: addLabel.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!data.accessible) {
        showToast(`Added but not accessible: ${data.error}`, 'error')
      } else {
        showToast(`Volume "${data.label}" added successfully`)
      }
      setShowAdd(false)
      setAddPath('')
      setAddLabel('')
      fetchVolumes()
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />

        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Storage Volumes</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage up to {MAX_VOLUMES} storage locations. Enable or disable each independently.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => fetchVolumes()}
                title="Refresh"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
              </button>
              {agentOnline && volumes.length < MAX_VOLUMES && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-700"
                >
                  <Plus size={16} /> Add Volume
                </button>
              )}
            </div>
          </header>

          {/* Agent offline banner */}
          {!loading && !agentOnline && (
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              <AlertCircle size={18} className="shrink-0" />
              Agent is offline — start the agent to manage storage volumes.
            </div>
          )}

          {/* Volume cards */}
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400">
              <RefreshCw size={24} className="animate-spin text-indigo-500 mr-3" />
              <span className="text-sm">Loading volumes...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {volumes.map((vol) => {
                const usedPct = vol.disk ? pct(vol.disk.usedBytes, vol.disk.totalBytes) : 0
                const isEditing = editingId === vol.id

                return (
                  <div
                    key={vol.id}
                    className={`relative flex flex-col rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 transition ${vol.enabled && vol.accessible
                        ? 'ring-slate-200/70'
                        : vol.enabled && !vol.accessible
                          ? 'ring-rose-200'
                          : 'ring-slate-100 opacity-60'
                      }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${vol.accessible ? 'bg-emerald-50 text-emerald-600'
                            : vol.enabled ? 'bg-rose-50 text-rose-600'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                          <HardDrive size={20} />
                        </div>

                        <div className="min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                autoFocus
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRelabel(vol.id)
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                                className="w-36 rounded-lg border border-indigo-300 px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <button onClick={() => handleRelabel(vol.id)} className="text-indigo-600 hover:text-indigo-800"><Save size={15} /></button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-slate-800 truncate max-w-[140px]" title={vol.label}>{vol.label}</h3>
                              <button
                                onClick={() => { setEditingId(vol.id); setEditLabel(vol.label) }}
                                className="text-slate-300 hover:text-indigo-500 transition"
                                title="Rename"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 font-mono truncate max-w-[200px]" title={vol.storagePath}>
                            {vol.storagePath}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${vol.accessible ? 'bg-emerald-100 text-emerald-700'
                          : vol.enabled ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {vol.accessible ? 'Active' : vol.enabled ? 'Error' : 'Disabled'}
                      </span>
                    </div>

                    {/* Error message */}
                    {vol.enabled && vol.error && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span className="break-all">{vol.error}</span>
                      </div>
                    )}

                    {/* Disk bar */}
                    {vol.accessible && vol.disk && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{formatBytes(vol.disk.usedBytes)} used</span>
                          <span>{formatBytes(vol.disk.freeBytes)} free</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${usedPct > 90 ? 'bg-rose-500' : usedPct > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          {usedPct}% of {formatBytes(vol.disk.totalBytes)}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        onClick={() => handleToggle(vol)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${vol.enabled
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                      >
                        {vol.enabled ? <><PowerOff size={13} /> Disable</> : <><Power size={13} /> Enable</>}
                      </button>

                      <button
                        onClick={() => handleRemove(vol)}
                        disabled={volumes.length <= 1}
                        title={volumes.length <= 1 ? 'Cannot remove the last volume' : 'Remove from Storva'}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Empty slot hint */}
              {agentOnline && volumes.length < MAX_VOLUMES && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-500"
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium">Add storage volume</span>
                  <span className="text-xs">{volumes.length}/{MAX_VOLUMES} slots used</span>
                </button>
              )}
            </div>
          )}

          {/* Info box */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Info size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Cara kerja multi-volume</h3>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">
                  <p>
                    Tambahkan volume via tombol <strong>Add Volume</strong> atau langsung dari{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-indigo-600">STORVA_STORAGE_PATHS</code>{' '}
                    (comma-separated, maks {MAX_VOLUMES}).
                  </p>
                  <p>
                    Volume yang <strong>disabled</strong> tidak ditampilkan di file browser dan tidak diwatch. Volume dengan path tidak dapat diakses akan menampilkan error tapi tidak menghentikan agent.
                  </p>
                  <p>
                    Menghapus volume dari sini <strong>tidak menghapus file</strong> — hanya melepas registrasinya dari Storva.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <RightPanel />
      </div>

      {/* ── Add Volume Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="text-indigo-600" size={22} />
                <h3 className="text-lg font-bold text-slate-800">Add Storage Volume</h3>
              </div>
              <button onClick={() => { setShowAdd(false); setAddError(null) }} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Storage Path <span className="text-rose-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g.  E:\  or  /mnt/nas/media"
                  value={addPath}
                  onChange={(e) => { setAddPath(e.target.value); setAddError(null) }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Label <span className="text-slate-400 font-normal">(optional — auto-generated if blank)</span></label>
                <input
                  type="text"
                  placeholder="e.g.  Media Drive"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {addError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                  <AlertCircle size={14} /> {addError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setShowAdd(false); setAddError(null) }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !addPath.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Volume'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}