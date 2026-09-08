'use client'

import Link from 'next/link'
import { Sidebar, HeroCard, StorageCards, RecentFilesTable, FoldersCard, RightPanel } from './dashboard'
import { useAuth } from '@/lib/auth'
import { DevicePicker } from './device-picker'
import { useDashboardData } from '@/lib/dashboard-data'
import { useConnectionStatus } from '@/lib/useConnectionStatus'

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function DashboardShell() {
  const { storage } = useDashboardData()
  const connection = useConnectionStatus()
  const { user } = useAuth()
  const percentUsed = Math.round(storage?.percentUsed ?? 0)
  const status = percentUsed >= 95 ? 'Critical' : percentUsed >= 85 ? 'Warning' : 'Healthy'
  const statusColor = percentUsed >= 95 ? 'text-rose-600' : percentUsed >= 85 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_minmax(0,1fr)_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />
        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          {connection.updateAvailable && (
            <div className="flex items-center justify-between rounded-[1.25rem] bg-amber-50 px-5 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <span>
                Agent <span className="font-semibold">v{connection.version}</span> is behind the latest{' '}
                <span className="font-semibold">v{connection.latestVersion}</span>.
              </span>
              <Link className="font-medium underline" href="/settings/connection">Update</Link>
            </div>
          )}
          <HeroCard status={connection.status} />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Disk Space</h2>
                  <p className="text-sm text-slate-500">{formatBytes((storage?.totalBytes || 0) - (storage?.usedBytes || 0))} free of {formatBytes(storage?.totalBytes)}</p>
                </div>
                <div className={`text-sm font-bold ${statusColor}`}>{status}</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${percentUsed >= 95 ? 'bg-rose-500' : percentUsed >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
              </div>
              <div className="mt-2 text-right text-xs text-slate-400">{100 - percentUsed}% free</div>
            </div>
            <DevicePicker />
          </div>
          <StorageCards />
          {user && (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <RecentFilesTable />
              <FoldersCard />
            </div>
          )}
        </section>
        <RightPanel />
      </div>
    </main>
  )
}

