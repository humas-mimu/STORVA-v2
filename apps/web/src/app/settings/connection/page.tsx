'use client'

import { useConnectionStatus } from '@/lib/useConnectionStatus'
import { Sidebar, RightPanel } from '@/components/dashboard'
import { Activity, ShieldCheck, Zap, Globe, WifiOff, Settings as SettingsIcon } from 'lucide-react'

export default function ConnectionSettings() {
  const conn = useConnectionStatus()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 text-slate-700 md:p-6">
      <div className="mx-auto flex flex-col h-screen overflow-hidden border border-white/70 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid md:h-dvh md:min-h-[920px] grid-w-[1440px] md:grid-cols-[240px_1fr_320px] md:gap-6 md:rounded-[2rem] md:p-5">
        <Sidebar />
        <section className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-0 md:pr-1 md:h-full">
          <header className="sticky top-0 z-20 flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Connection Settings</h1>
              <p className="mt-1 text-sm text-slate-500">Manage local and remote access to your Storva NAS.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Globe size={24} />
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Agent Status</h3>
                  <div className="text-xs text-slate-500">Local Service</div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${conn.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${conn.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {conn.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              {conn.status === 'online' && conn.agentInfo && (
                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Version</span>
                    <span className="font-medium text-slate-700">{conn.agentInfo.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latency</span>
                    <span className="font-medium text-slate-700">{conn.latency} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Storage Root</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{conn.agentInfo.storageRoot}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Remote Access</h3>
                  <div className="text-xs text-slate-500">Cloudflare / Tailscale</div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Cloudflare Tunnel</span>
                <span className="text-sm font-medium text-slate-800">{conn.tunnelUrl || 'Not configured'}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Tailscale Node</span>
                <span className="text-sm font-medium text-slate-800">{conn.tailscaleAvailable ? 'Available' : 'Not configured'}</span>
              </div>
            </div>
          </div>
        </section>
        <RightPanel />
      </div>
    </main>
  )
}
