# Panduan Setup Neon PostgreSQL untuk Project Storva

## Daftar Isi
1. [Buat Akun & Project di Neon](#1-buat-akun--project-di-neon)
2. [Copy Connection String](#2-copy-connection-string)
3. [Konfigurasi File .env](#3-konfigurasi-file-env)
4. [Verifikasi Schema Prisma](#4-verifikasi-schema-prisma)
5. [Jalankan Migrate & Generate](#5-jalankan-migrate--generate)
6. [Seed Data Demo](#6-seed-data-demo-opsional)
7. [Verifikasi Koneksi](#7-verifikasi-koneksi)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Buat Akun & Project di Neon

1. Buka [neon.tech](https://neon.tech) → klik **Sign Up**
2. Bisa daftar pakai **GitHub** (lebih cepat)
3. Setelah masuk dashboard, klik **New Project**
4. Isi form:
   - **Project name**: `storva`
   - **PostgreSQL version**: `16` (default, biarkan)
   - **Region**: `ap-southeast-1 (Singapore)` — paling dekat dari Indonesia
5. Klik **Create Project**

> Dashboard akan langsung tampil connection string setelah project dibuat.

---

## 2. Copy Connection String

1. Di dashboard Neon, pilih tab **Prisma** (bukan tab `psql` atau `.env`)
2. Copy connection string yang formatnya:

```
postgresql://user:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Penting:** Selalu pakai tab **Prisma** bukan tab lain — format connection string-nya berbeda dan yang tab Prisma sudah include `sslmode=require` yang wajib ada.

---

## 3. Konfigurasi File .env

Project Storva adalah monorepo. Ada **dua file `.env`** yang berbeda tujuannya:

```
storva/
├── apps/
│   ├── web/
│   │   └── .env        ← berisi DATABASE_URL untuk Neon
│   └── agent/
│       └── .env        ← berisi STORVA_STORAGE_PATHS, TIDAK perlu DATABASE_URL
└── .env.example        ← template saja, tidak dibaca langsung oleh app
```

### apps/web/.env

Buat file ini kalau belum ada (copy dari `.env.example` dulu):

```env
# ── Database (Neon PostgreSQL) ────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# ── Agent connection dari web ─────────────────────────────────────────────────
STORVA_AGENT_URL="http://127.0.0.1:5125"

# ── JWT Secret untuk session ──────────────────────────────────────────────────
# Generate random string minimal 32 karakter, contoh pakai perintah:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="isi-dengan-random-string-panjang-minimal-32-karakter"

# ── Next.js ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:8787"
```

### apps/agent/.env

```env
# ── Storage Volumes (comma-separated, maksimal 8) ─────────────────────────────
STORVA_STORAGE_PATHS=D:\

# Tambah volume lain kalau perlu, contoh:
# STORVA_STORAGE_PATHS=D:\,E:\,F:\Media

# ── Agent Config ──────────────────────────────────────────────────────────────
STORVA_AGENT_PORT=5125
STORVA_AGENT_HOST=127.0.0.1

# ── Cloud Sync ────────────────────────────────────────────────────────────────
# Kosongkan kalau tidak pakai cloud sync — reconciler akan skip otomatis
# STORVA_CLOUD_URL=
```

> **Catatan:** `apps/agent/.env` tidak perlu `DATABASE_URL`. Agent pakai SQLite lokal (`better-sqlite3`) untuk sync queue dan volume registry — bukan PostgreSQL.

---

## 4. Verifikasi Schema Prisma

Buka `apps/web/prisma/schema.prisma`. Untuk Neon, **tidak perlu ubah apapun** — cukup pastikan isinya seperti ini:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

> **Kenapa tidak perlu `directUrl`?** Neon sudah handle connection pooling otomatis di sisi mereka. Berbeda dengan Supabase yang butuh dua URL berbeda (`DATABASE_URL` dan `DIRECT_URL`). Untuk Neon cukup satu URL.

> **`relationMode = "prisma"` kapan ditambah?** Hanya tambahkan kalau dapat error `too many connections` saat development. Kalau tidak ada masalah, biarkan schema apa adanya.

---

## 5. Jalankan Migrate & Generate

Buka terminal di root project (`E:\GitHub\storva`):

### Langkah 5a — Generate Prisma Client

```bash
cd apps/web
pnpm prisma generate
```

Output yang diharapkan:
```
✔ Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client
```

### Langkah 5b — Jalankan Migrasi

**Kalau sudah ada folder `migrations`** (project sudah pernah migrate sebelumnya):

```bash
pnpm prisma migrate deploy
```

**Kalau belum ada folder `migrations` atau mau fresh start:**

```bash
pnpm prisma migrate dev --name init
```

Output yang diharapkan:
```
Applying migration `20240901_init`
✔ Database synchronized
```

Ini akan membuat semua tabel berikut di Neon:
- `users`
- `sessions`
- `devices`
- `file_metadata`
- `activities`
- `upload_sessions`
- `download_sessions`
- `share_links`

---

## 6. Seed Data Demo (Opsional)

Kalau mau langsung ada user untuk login tanpa harus daftar manual:

### Dari root project:

```bash
pnpm prisma:seed
```

### Kalau perintah di atas tidak jalan:

```bash
cd apps/web
npx ts-node prisma/seed.ts
```

### Hasil seed — kredensial demo:

| Field    | Value               |
|----------|---------------------|
| Email    | `demo@storva.local` |
| Password | `Storva123!`        |
| Username | `demo`              |

> Kredensial ini hanya untuk development. Ganti password setelah login pertama kali.

---

## 7. Verifikasi Koneksi

### Cara 1 — Cek lewat Neon Dashboard

1. Buka [console.neon.tech](https://console.neon.tech)
2. Pilih project `storva`
3. Klik **Tables** di sidebar kiri
4. Pastikan tabel `users`, `sessions`, `devices`, `file_metadata`, `activities` sudah muncul

### Cara 2 — Jalankan project dan test login

```bash
# Di root project
pnpm dev
```

Buka `http://localhost:8787`, coba login dengan:
- Email: `demo@storva.local`
- Password: `Storva123!`

Kalau berhasil masuk dashboard, koneksi Neon sudah jalan sempurna.

### Cara 3 — Test koneksi langsung via Prisma

```bash
cd apps/web
npx prisma db pull
```

Kalau tidak ada error, koneksi berhasil.

---

## 8. Troubleshooting

### Error: `P1001 Can't reach database server`

```
Error: P1001: Can't reach database server at `ep-xxx.neon.tech:5432`
```

**Penyebab:** Connection string salah atau tidak ada internet.

**Solusi:**
- Cek ulang `DATABASE_URL` di `apps/web/.env`
- Pastikan copy dari tab **Prisma** di Neon dashboard, bukan tab lain
- Coba ping: `ping ep-xxx.ap-southeast-1.aws.neon.tech`

---

### Error: `SSL connection required`

```
Error: SSL connection is required
```

**Penyebab:** URL tidak include `?sslmode=require`.

**Solusi:** Tambahkan di akhir URL:

```env
DATABASE_URL="postgresql://...@neon.tech/neondb?sslmode=require"
```

---

### Error: `too many connections`

```
Error: sorry, too many clients already
```

**Penyebab:** Next.js dev mode spawn banyak Prisma Client instance.

**Solusi:** Tambahkan `relationMode` di schema:

```prisma
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

Lalu jalankan ulang:

```bash
pnpm prisma generate
pnpm dev
```

---

### Error: `Migration failed` saat `migrate deploy`

**Solusi:** Reset dan migrate ulang dari awal:

```bash
cd apps/web

# Hapus semua tabel dan migration history
pnpm prisma migrate reset

# Buat migration baru dari schema
pnpm prisma migrate dev --name init

# Seed ulang kalau perlu
npx ts-node prisma/seed.ts
```

> **Peringatan:** `prisma migrate reset` akan menghapus semua data di database. Hanya lakukan di development, jangan di production.

---

### Error: `Environment variable not found: DATABASE_URL`

**Penyebab:** File `.env` tidak ada atau salah lokasi.

**Solusi:**
```bash
# Pastikan .env ada di apps/web/, bukan di root
ls apps/web/.env

# Kalau tidak ada, buat dari template
cp .env.example apps/web/.env
# Lalu edit dan isi DATABASE_URL dengan connection string Neon
```

---

## Ringkasan Perintah

```bash
# 1. Masuk ke folder web app
cd apps/web

# 2. Generate Prisma Client
pnpm prisma generate

# 3. Jalankan migrasi ke Neon
pnpm prisma migrate deploy

# 4. Seed data demo (opsional)
npx ts-node prisma/seed.ts

# 5. Kembali ke root dan jalankan project
cd ../..
pnpm dev
```

---

*Dibuat untuk project Storva v0.1.0 — Neon PostgreSQL free tier*
