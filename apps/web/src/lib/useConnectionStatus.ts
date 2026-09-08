'use client'

import { useEffect, useState } from 'react'

export type ConnectionStatus = 'online' | 'offline'
export interface ConnectionInfo {
  status: ConnectionStatus
  latency?: number
  agentInfo?: any
  tunnelUrl?: string
  tailscaleAvailable?: boolean
  version?: string
  latestVersion?: string
  updateAvailable?: boolean
}

export function useConnectionStatus() {
  const [info, setInfo] = useState<ConnectionInfo>({
    status: 'offline',
  })

  useEffect(() => {
    let mounted = true
    const checkConnection = async () => {
      try {
        const healthRes = await fetch('/api/connection/health')
        if (!mounted) return
        if (!healthRes.ok) {
          setInfo({ status: 'offline' })
          return
        }
        const healthData = await healthRes.json()
        // Optionally fetch version separately
        let versionInfo: { latestVersion?: string } = {}
        try {
          const versionRes = await fetch('/api/agent/version')
          if (versionRes.ok) {
            versionInfo = await versionRes.json()
          }
        } catch {
          // Version registry unavailable; connection health remains valid.
        }
        const updateAvailable = versionInfo.latestVersion && healthData.agent?.version
          ? versionInfo.latestVersion !== healthData.agent.version
          : false
        setInfo({
          status: 'online',
          latency: healthData.latency,
          agentInfo: healthData.agent,
          tunnelUrl: healthData.tunnelUrl,
          tailscaleAvailable: healthData.tailscaleAvailable,
          version: healthData.agent?.version,
          latestVersion: versionInfo.latestVersion,
          updateAvailable,
        })
      } catch (err) {
        if (!mounted) return
        setInfo({ status: 'offline' })
      }
    }

    const interval = setInterval(checkConnection, 15000) // every 15 seconds
    checkConnection() // immediate check

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return info
}
