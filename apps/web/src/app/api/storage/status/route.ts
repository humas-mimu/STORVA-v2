/**
 * /api/storage/status
 * Langsung fetch ke agent /storage/stats (tidak lewat catch-all proxy).
 * Endpoint ini dipanggil oleh RightPanel dashboard — harus cepat.
 * Memakai AbortSignal.timeout supaya tidak hang kalau agent lambat startup.
 */

const AGENT_URL = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const vol = searchParams.get('vol')
  const url = vol
    ? `${AGENT_URL}/storage/stats?vol=${encodeURIComponent(vol)}`
    : `${AGENT_URL}/storage/stats`

  try {
    // 6 second timeout — agent /storage/stats is now instant (statfs only).
    // If it takes longer than this the agent is busy starting up; return
    // offline rather than hanging the dashboard.
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6_000),
    })
    if (!response.ok) throw new Error(`Agent responded ${response.status}`)
    return Response.json(await response.json())
  } catch {
    return Response.json({ status: 'offline', error: 'Storage unavailable', totalBytes: 0, usedBytes: 0, freeBytes: 0, percentUsed: 0 }, { status: 200 })
  }
}
