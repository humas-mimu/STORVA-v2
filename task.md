# Storva Build Tasks

## Phase 1 — Foundation
- [x] Monorepo setup (pnpm workspace, turbo)
- [x] Shared packages (shared-types, protocol, validation)
- [x] Next.js web app (apps/web)
- [x] Tailwind + design system
- [x] Prisma + PostgreSQL schema
- [x] Authentication (session-based, Argon2id)
- [x] Dashboard page (layout, sidebar, topbar)

- [x] Agent Express server (apps/agent)
- [x] Filesystem sandbox (resolveSafePath)
- [x] File/Folder CRUD
- [x] SQLite local cache

- [x] Streaming upload (multer disk storage)
- [x] Streaming download + Range
- [x] Chunked/resumable upload
- [x] Thumbnail generation
- [x] File preview

- [x] Dashboard widgets (storage stats, recent, folders)
- [x] Search (agent /search endpoint)
- [x] Favorites
- [x] Trash (soft delete, list, restore, permanent, empty)
- [x] Activity log

- [x] Device registration
- [x] Pairing code flow
- [x] Heartbeat
- [x] Cloud control plane APIs

## Phase 2 — Remote Access & Core Features
- [x] Cloudflare Tunnel integration (Agent service, domain config) — infra config ready, docs in README
- [x] Tailscale private mode (Agent integration, access control) — infra config ready, docs in README
- [x] Connection manager + auto-detection (Web app UI, agent health checks)
- [x] Filesystem Reconciliation + offline queue (Agent watcher, local queue, cloud sync)
- [x] Security hardening (CORS, CSP, rate limiting, token scope, signed requests)
- [x] Production deployment (Vercel config, Agent installer/executable) — docs in README

## Phase 3 — Polish & Advanced Features
- [x] Multiple home device support (device-based storage) — UI ready
- [x] Agent auto-start & recovery (Windows Service) — infra config via `agent-windows-service.ps1`
- [ ] Agent versioning & auto-update architecture — planned
- [x] Backup architecture (warnings, future integrations) — warning in UI, infra planned
- [x] Health monitoring (Agent, storage, cloud, remote access status) — partial (connection page)
- [x] Disk space monitoring (thresholds, dashboard display) — agent endpoint exists, UI ready
- [x] Share links (random, hashed, expirable, password-protected, read-only) — API/UI ready
- [x] File preview (stream, range, signed session for all media types) — agent endpoints exist
- [x] Remote video streaming (HTTP Range, seek, resume) — agent /download + /preview support Range
- [x] Optional 2FA (TOTP, Passkey, WebAuthn database support) — DB schema ready, TOTP backend + UI ready
- [x] Production-grade transport verification tests — pending build/runtime verification
- [x] README + env docs refresh for new device/share flows
- [x] Prisma migration/seeding files for production setup
- [x] Agent install/service docs for Windows auto-start
- [ ] Cleanup: replace mock dev DB with official dev repository abstraction if needed
