import { spawnSync } from 'node:child_process'
import process from 'node:process'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function run(label, args, options = {}) {
  console.log(`[STORVA] ${label}`)
  const result = spawnSync(pnpm, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

// Keep installation deterministic: first generate the Prisma client from the
// web workspace where the Prisma CLI is declared, then initialize/check the
// persistent local data store. Never run database migrations automatically.
run('Generating Prisma Client...', [
  '--filter', '@storva/web', 'exec', 'prisma', 'generate',
])

run('Initializing persistent STORVA data (safe/no-overwrite mode)...', [
  'storva:data:init',
])

run('Checking persistent STORVA data...', [
  'storva:data:check',
])

console.log('[STORVA] Installation setup completed.')
console.log('[STORVA] PostgreSQL migrations are intentionally manual: pnpm prisma:migrate')
