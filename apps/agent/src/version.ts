// Single source of truth for the agent version. Bump on releases.
export const AGENT_VERSION = '0.1.0'
export const AGENT_CHANNEL = 'stable'
export const AGENT_BUILD = process.env.BUILD_SHA || 'dev'
export const AGENT_UPDATE_URL = process.env.STORVA_UPDATE_URL || 'https://updates.storva.local/agent.json'

export interface AgentVersionInfo {
  version: string
  channel: string
  build: string
  updateUrl: string
}

export function getAgentVersionInfo(): AgentVersionInfo {
  return {
    version: AGENT_VERSION,
    channel: AGENT_CHANNEL,
    build: AGENT_BUILD,
    updateUrl: AGENT_UPDATE_URL,
  }
}
