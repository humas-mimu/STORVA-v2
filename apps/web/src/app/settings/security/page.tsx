'use client'

import { useState, useEffect } from 'react'

export default function SecurityPage() {
  const [token, setToken] = useState('')
  const [userId, setUserId] = useState('')
  useEffect(() => {
    setUserId(localStorage.getItem('storvaUserId') || '')
  }, [])
  const [message, setMessage] = useState('')

  async function setup() {
    const res = await fetch(`/api/auth/2fa/setup?userId=${encodeURIComponent(userId)}`, { method: 'POST' })
    const data = await res.json()
    setMessage(data.secret ? 'Secret generated. Scan QR in auth app.' : data.error || 'Failed')
  }

  async function verify() {
    const res = await fetch(`/api/auth/2fa/verify?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    setMessage(data.success ? '2FA enabled' : data.error || 'Failed')
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="mt-2 text-sm text-slate-500">Enable TOTP 2FA for account protection.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={setup} className="rounded-xl bg-indigo-600 px-4 py-2 text-white">Generate Secret</button>
        </div>
        <div className="mt-4 flex gap-3">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456" className="flex-1 rounded-xl border px-3 py-2" />
          <button onClick={verify} className="rounded-xl bg-slate-900 px-4 py-2 text-white">Verify</button>
        </div>
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </div>
    </main>
  )
}
