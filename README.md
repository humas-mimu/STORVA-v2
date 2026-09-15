# STORVA — Your Personal Storage

Storva is a hybrid cloud, self-hosted Personal NAS & Private Cloud Web Application.
Your filesystem remains safely at home (e.g. `D:\Storva`), while the Web App (Next.js) runs on Vercel or locally.

---
## 🏗 Architecture

- **Web App (`apps/web`)**: Next.js 15, Tailwind, React, Prisma. Acts as UI + Cloud Control Plane.
- **Agent (`apps/agent`)**: Express background service running on home PC with direct filesystem access.
- **Shared Auth (`packages/shared-auth`)**: JWT-based signed requests with scope enforcement.
- **Validation (`packages/validation`)**: Path traversal safety (`resolveSafePath`).
- **Protocol (`packages/protocol`)**: Shared TypeScript types & Zod schemas for Web↔Agent communication.
- **Shared Types (`packages/shared-types`)**: Common types used across packages.

---
## 🛠 Development & Setup

### Environment Variables

For the Web app, copy the example to `apps/web/.env.local`. Keep the Agent environment in `apps/agent/.env`.

```env
# Cloud Control Plane / Web
STORVA_DATA_DIR=
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/storva?schema=public" # Optional in DEV!
SIGNING_PRIVATE_KEY="super-secret-signing-key-minimum-32-chars-long"
STORVA_AGENT_URL="http://127.0.0.1:5125"
STORVA_STORAGE_PATH="D:\Storva" # or /home/user/Storva on Linux
```

> **Note:**
> - `SIGNING_PRIVATE_KEY` must be at least 32 characters.
> - `STORVA_AGENT_URL` points to the agent's HTTP endpoint (local dev uses `127.0.0.1:5125`).
> - `DATABASE_URL` is optional for local development. If it is omitted, Storva uses a file-backed persistent database outside the source tree.

### Dev Mode Without PostgreSQL

Storva supports a **zero-external-DB dev mode**. When `DATABASE_URL` is intentionally omitted, the web app uses a JSON database stored in a **persistent data directory outside the application source tree**.

The location is controlled by `STORVA_DATA_DIR`. When it is unset, Storva chooses an OS-specific application-data directory. On Windows the default is under `%LOCALAPPDATA%\Storva\data`; on macOS it is under `~/Library/Application Support/Storva/data`; on Linux it is under `$XDG_STATE_HOME/storva` or `~/.local/state/storva`.

The persistent directory is the user's state. Updating or replacing the application source under `apps/web` must not replace it.

Persistent local data layout:

```text
<STORVA_DATA_DIR>/
├── database/
│   └── dev-db.json
├── backups/
└── system/
    └── manifest.json
```

The mock database contains application state such as users, sessions, devices, file metadata, activities, upload/download sessions, share links, and privacy rules.

### Running Locally

```bash
# 1. Install dependencies (run from the repository root)
pnpm install

> **Otomatis:** `pnpm install` sekarang menjalankan setup project: generate Prisma Client,
> inisialisasi persistent data bila aman, lalu pengecekan data. Git, Node.js, pnpm,
> dan build tools OS tetap harus dipasang manual. PostgreSQL migration tetap manual.

# 2. Prisma Client, persistent data initialization, and safety checks run automatically from pnpm install

# 3. Start the agent (one terminal)
pnpm dev:agent

# 4. Start the web app (another terminal)
pnpm dev:web
```

Open the following address in your browser:

```text
http://localhost:8787
```

Make sure the web page appears and there are no errors in the terminal. If using an external PostgreSQL, ensure `DATABASE_URL` in `.env` is set to a valid URL.

### Persistent Data & Safe Application Updates

For local/mock mode, treat the persistent data directory as **user data, not application code**. A source update should replace the application tree while leaving the data directory untouched.

Before replacing an existing installation, create and verify a backup:

```bash
pnpm storva:data:preupdate
```

For an older installation that still keeps `apps/web/dev-db.json`, migrate it **before** replacing the source tree:

> The migration command only treats a legacy file as authoritative when it contains persistent state such as users, file metadata, share links, privacy rules, sessions, or devices. A bundled/runtime-only sample DB is not allowed to override an existing storage directory.


```bash
pnpm storva:data:migrate-legacy
pnpm storva:data:init
pnpm storva:data:check
```

Storva also performs a one-time legacy migration when the old database is still present at startup. The explicit migration command is safer for installers/updaters because the old source tree can be removed immediately afterward.

On startup, Storva refuses to create a new empty database when the configured storage folder already contains user files but the persistent database is missing. This prevents the dangerous sequence of “database lost → empty database created → private/share state appears lost”.

For a deliberate first-time metadata initialization on an existing storage folder, set `STORVA_ALLOW_EMPTY_DB=true` for that one startup only, after making a manual backup or confirming there is no previous metadata database.

Recommended Windows production/local layout:

```text
C:\ProgramData\Storva\data\      ← persistent user state
C:\path\to\storva\apps\web\   ← replaceable application source
D:\Storva\                         ← actual file storage
```

Keep `STORVA_DATA_DIR` explicitly configured when the web process runs under a service account, so the service and administrator tools resolve the same data directory.

---
## 🔒 Security Hardening

1. **Path Traversal Protection**: Every agent operation uses `resolveSafePath` to lock access strictly inside `STORVA_STORAGE_PATH`.
2. **Signed Token & Scopes**: All remote operations to agent require a short-lived signed JWT containing scopes (`storage:read`, `storage:write`, `storage:delete`, `storage:share`).
3. **HTTP Hardening**: Strict CSP, HSTS, X-Content-Type-Options headers + Rate limiting on auth endpoints.
4. **Offline Queue & Reconciler**: Agent uses `chokidar` to monitor local file changes and queues metadata sync events when offline.

---
## 🚀 New Features (Phase 3)

- **Share Links**: Create public share links with expiration, read-only mode, and optional password. Access via `/share/[token]`.
- **Multi-Device Management**: Register multiple home PCs/NAS and switch between them from the Dashboard.
- **Disk Usage Monitoring**: Real-time storage tracking with Warning (85%) and Critical (95%) visual alerts on the dashboard.
- **Direct-to-Agent Transport**: High-speed file transfer via signed tokens, bypassing Vercel binary proxy.

---
## 🚢 Production Deployment

1. **Database**: Provision PostgreSQL on Neon / Supabase / Vercel Marketplace and set `DATABASE_URL`.
2. **Vercel**: Deploy `apps/web` to Vercel. Set `DATABASE_URL`, `SIGNING_PRIVATE_KEY`, and `STORVA_AGENT_URL` (or Cloudflare Tunnel URL). The external persistent JSON database is for local/self-hosted mock mode only; production should use PostgreSQL.
3. **Home PC Agent**: Run `apps/agent` as a background service/Windows service connected via Cloudflare Tunnel or Tailscale.


--------------------------------------
# Bikin Storva Bisa "Deploy Sendiri" Tanpa Command Line (buat user lain)

Tujuan: user lain cukup **klik-klik di browser** (tanpa `git clone`/`git push` manual) untuk punya instance Storva sendiri — **dan** bisa ikut update saat kalian merilis perubahan baru, juga tanpa command line.

---

## Langkah 0 — Kalian tetap push SATU KALI (repo master)

Ini tidak bisa dihilangkan — harus ada satu repo asli di GitHub sebagai sumbernya:

```bash
cd STORVA-v2-main
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<ORG-KALIAN>/<NAMA-REPO>.git
git branch -M main
git push -u origin main
```

Setelah ini, **kalian tidak perlu push manual lagi tiap ada user baru** — repo ini jadi sumber untuk semua orang. Tiap kali kalian mau merilis update, tinggal `git push` seperti biasa ke repo ini.

---

## Langkah 1 — User lain: Fork (JANGAN pakai "Use this template" / tombol Deploy)

> ⚠️ **Koreksi penting**: baik fitur **"Use this template"** di GitHub maupun tombol **"Deploy with Vercel"**, dua-duanya menghasilkan salinan yang **terputus total** dari repo asli — tidak ada cara resmi untuk menariknya update lagi setelahnya. Supaya user bisa update, mereka harus pakai **Fork** biasa (tombol di kanan atas halaman repo), yang tetap mengingat "berasal dari mana".

Instruksikan ke user lain:

1. Buka `https://github.com/<ORG-KALIAN>/<NAMA-REPO>`
2. Klik tombol **Fork** (pojok kanan atas) → **Create fork**
3. Repo tersalin ke akun GitHub mereka, dengan keterangan "forked from `<ORG-KALIAN>/<NAMA-REPO>`"

> Kalau repo kalian **private**: user harus diundang dulu sebagai collaborator (Settings → Collaborators) sebelum bisa fork.

---

## Langkah 2 — Import fork mereka ke Vercel

1. Buka https://vercel.com/new
2. Pilih repo hasil fork mereka (bukan repo kalian)
3. Set **Root Directory** → `apps/web`
4. `buildCommand` sudah otomatis terbaca dari `vercel.json` yang sudah kalian commit (`prisma generate && prisma migrate deploy && next build`) — tidak perlu diisi manual
5. Isi Environment Variables:
   - `DATABASE_URL` — bisa dibuat sekalian tanpa keluar dari layar ini: tab **Storage → Create Database → Neon** (integrasi resmi Vercel), otomatis terisi
   - `SIGNING_PRIVATE_KEY` — random string ≥32 karakter, unik per user (jangan dibagi/disamakan antar user)
   - `NEXT_PUBLIC_APP_URL` — bisa diisi setelah tahu URL vercel-nya, update belakangan
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — bebas
   - `STORVA_AGENT_URL` — isi sementara `http://127.0.0.1:5125`, akan diupdate di Langkah 4
6. Klik **Deploy**

---

## Langkah 3 — Setup agent di PC/NAS mereka (tetap manual, tidak bisa dihindari)

Karena agent butuh akses filesystem fisik, ini satu-satunya bagian yang memang harus tiap orang lakukan sendiri:

1. Install & jalankan `apps/agent` di PC/NAS mereka
2. Setup tunnel publik (lihat `SETUP-TUNNEL-AGENT.md`)
3. Update `STORVA_AGENT_URL` di project Vercel mereka dengan URL tunnel → redeploy

---

## Langkah 4 — Cara user update instance mereka saat kalian rilis versi baru (TANPA command line)

Ini keuntungan utama pakai Fork dibanding template/tombol deploy:

1. User buka halaman fork mereka di GitHub
2. Kalau ada commit baru di repo asli kalian, GitHub otomatis menampilkan banner:
   *"This branch is X commits behind `<ORG-KALIAN>/<NAMA-REPO>:main`"* dengan tombol **Sync fork**
3. Klik **Sync fork → Update branch**
4. Selesai — GitHub yang push perubahan ke fork mereka secara otomatis, dan karena fork itu sudah terhubung ke Vercel, **otomatis ter-redeploy sendiri** (termasuk migrasi database baru, karena `prisma migrate deploy` ada di `buildCommand`)

Full lewat browser, tidak ada `git pull`/`git push` manual.

### Batasan yang perlu disampaikan ke user

- Kalau mereka **tidak pernah mengubah kode** di fork-nya sendiri (cuma isi env var), "Sync fork" akan selalu mulus.
- Kalau mereka **sempat edit file kode langsung** (ganti logo/teks di source, dll) dan kalian juga mengubah file yang sama di update terbaru, "Sync fork" bisa menampilkan conflict — di titik itu baru butuh git manual (atau resolve conflict lewat GitHub web editor untuk kasus sederhana). Saran ke user: taruh kustomisasi di env var kalau memungkinkan, jangan edit file inti.

---

## Ringkasan alur lengkap user lain

1. **Fork** repo kalian (klik tombol, browser saja)
2. **Import** hasil fork ke Vercel + hubungkan Neon lewat tab Storage (klik-klik, browser saja)
3. Install agent + tunnel di PC mereka (satu-satunya bagian manual, karena fisik)
4. Setiap ada update dari kalian → tinggal klik **Sync fork** di GitHub → otomatis redeploy

Command line hanya dipakai kalian (Langkah 0, sekali di awal, dan tiap kali kalian sendiri push update).
