'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function InactivityLogout() {
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutMs = 15 * 60 * 1000 // 15 minutes

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, timeoutMs)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return null
}
