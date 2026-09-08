/**
 * Standalone reconciler process.
 *
 * Runs the chokidar-based file watcher(s) and the sync-queue → cloud
 * flusher in their own dedicated Node process, completely separate from
 * the main HTTP-serving agent process (index.ts).
 *
 * Why: a heavy initial scan of a large storage root (e.g. a whole drive
 * like D:\) can keep a Node event loop busy processing thousands of fs
 * callbacks. If that scan ran inside the same process as the Express
 * server, /health and every other endpoint would be slow/unresponsive
 * during that window — which is exactly what made the web app show
 * "Agent is offline" even though the agent was technically alive. Running
 * it in its own OS process means the two have entirely separate event
 * loops; the reconciler can be as busy as it wants without ever delaying
 * an HTTP response from the main agent.
 *
 * Spawned via child_process.fork() from index.ts. All configuration comes
 * through environment variables inherited from the parent (dotenv output),
 * plus STORVA_RECONCILE_PATHS which the parent sets explicitly.
 */
import 'dotenv/config'
import { setupReconciliation } from './reconcile'

const paths = (process.env.STORVA_RECONCILE_PATHS || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)

if (paths.length === 0) {
  console.warn('[Reconciler Process] No STORVA_RECONCILE_PATHS provided — nothing to watch. Exiting.')
  process.exit(0)
}

console.log(`[Reconciler Process] pid=${process.pid} — watching ${paths.length} volume(s):`)
paths.forEach((p) => console.log(`  → ${p}`))

const stopFns = paths.map((p) => setupReconciliation(p))

function shutdown(signal: string) {
  console.log(`[Reconciler Process] Received ${signal}, shutting down...`)
  stopFns.forEach((fn) => fn())
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Surface otherwise-silent crashes instead of the process just vanishing.
process.on('uncaughtException', (err) => {
  console.error('[Reconciler Process] Uncaught exception:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[Reconciler Process] Unhandled rejection:', err)
})

// Let the parent (main agent process) know we're up and which paths we
// actually attached watchers to — used for the /health "reconciler" status.
if (process.send) {
  process.send({ type: 'ready', paths })
}
