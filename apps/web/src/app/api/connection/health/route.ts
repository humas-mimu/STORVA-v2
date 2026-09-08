import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const agentUrl = process.env.STORVA_AGENT_URL || 'http://127.0.0.1:5125'
  const start = Date.now()
  try {
    const res = await fetch(`${agentUrl}/health`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      return NextResponse.json({
        status: 'online',
        latency: Date.now() - start,
        agent: await res.json()
      })
    }
    return NextResponse.json({ status: 'unhealthy', code: res.status }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'offline' }, { status: 200 })
  }
}
