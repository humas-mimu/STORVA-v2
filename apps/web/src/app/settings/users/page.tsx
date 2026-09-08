'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 401) {
      router.push('/login')
      return
    }
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to load users')
      setUsers([])
    } else {
      setUsers(data.users || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Failed to create user')
    else {
      setMessage('User created')
      setUsername('')
      setPassword('')
      setRole('user')
      loadUsers()
    }
  }

  async function deleteUser(id: string) {
    setError('')
    setMessage('')
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Failed to delete user')
    else {
      setMessage('User deleted')
      loadUsers()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">User Management</h1>
        <p className="text-sm text-slate-500">Create and manage accounts for login access.</p>
      </div>

      {(error || message) && (
        <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <form onSubmit={createUser} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-4">
        <input className="rounded-xl border px-4 py-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required />
        <input className="rounded-xl border px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" required />
        <select className="rounded-xl border px-4 py-3" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700" type="submit">Add User</button>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={4}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={4}>No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-t border-slate-50 transition hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button 
                    className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100" 
                    onClick={() => deleteUser(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
