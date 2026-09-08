import { NextResponse } from 'next/server'

const LATEST_AGENT_VERSION = process.env.STORVA_LATEST_AGENT_VERSION || '0.1.0'
const DOWNLOAD_URL = process.env.STORVA_AGENT_DOWNLOAD_URL || 'https://storva.local/downloads/agent/latest'

export async function GET() {
  return NextResponse.json({
    latestVersion: LATEST_AGENT_VERSION,
    channel: 'stable',
    downloadUrl: DOWNLOAD_URL,
  })
}
