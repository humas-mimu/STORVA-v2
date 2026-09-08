'use client'

import { useEffect, useState } from 'react'
import { Server, CheckCircle2, Circle } from 'lucide-react'

export function DevicePicker() {
  const [devices, setDevices] = useState<any[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // mock user-id for dev demo; in prod, fetch from /api/auth/me
    const userId = localStorage.getItem('storvaUserId')
    if (!userId) {
      setLoading(false)
      return
    }
    const storedActive = localStorage.getItem('storvaActiveDevice')
    if (storedActive) setActive(storedActive)

    fetch(`/api/devices?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        setDevices(d.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function pick(id: string) {
    setActive(id)
    localStorage.setItem('storvaActiveDevice', id)
  }

  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">My Devices</h2>
        <Server size={18} className="text-slate-400" />
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No devices registered yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {devices.map((d) => {
            const isActive = active === d.id
            return (
              <li
                key={d.id}
                onClick={() => pick(d.id)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  isActive ? 'border-indigo-300 bg-indigo-50/50' : 'border-transparent bg-slate-50/80 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">{d.deviceName}</div>
                  <div className="text-xs text-slate-500">v{d.agentVersion} • seen {new Date(d.lastSeen).toLocaleTimeString()}</div>
                </div>
                {isActive ? (
                  <CheckCircle2 size={18} className="text-indigo-600" />
                ) : (
                  <Circle size={18} className="text-slate-300" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
