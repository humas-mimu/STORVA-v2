Panduan Lengkap Deploy Storva ke Vercel dengan Neon PostgreSQL
(Next.js 15, Prisma, Turborepo, Tailwind v4)

---
1. Prasyarat

┌─────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┐
│     Apa     │                                           Cara Persiapan                                           │
├─────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Akun Vercel │ Daftar di https://vercel.com (login dengan GitHub).                                                │
├─────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Akun Neon   │ Daftar di https://neon.tech, buat organization & project.                                          │
├─────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GitHub repo │ Proyek Storva sudah di‑push ke GitHub (root workspace berisi apps/web, packages/shared-auth, dll). │
├─────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Node ≥ 20   │ Untuk menjalankan perintah lokal (prisma, build).                                                  │
├─────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Git         │ Untuk push perubahan.                                                                              │
└─────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┘

▎ Catatan: Karena ini Turborepo, Vercel bisa membaca dari root dan menjalankan perintah build yang kita tentukan, atau kita dapat mengatur Root Directory ke apps/web.

---
2. Membuat Database di Neon

1. Login ke https://neon.tech → Projects → New Project.
2. Isi:
  - Project name: storva-prod (atau nama yang Anda sukai).
  - Region: pilih region terdekat pengguna (mis. AWS us-east-1).
  - Branch name: main (default).
  - Postgres version: 15 (atau terbaru).

3. Klik Create Project. Neon akan menyediakan connection string secara otomatis.

2.1 Ambil Connection String

Di halaman project Neon → Connection details → pilih Pooler (rekomendasi untuk serverless).
Salin string yang berbentuk:

postgres://[user]:[password]@[host]:[port]/[dbname]?sslmode=require

Contoh:

postgres://ep-quiet-water-123456.us-east-2.aws.neon.tech/storva?pgbouncer=true&connect_timeout=15

▎ Simpan string ini – akan kita gunakan sebagai DATABASE_URL di Vercel.

---
3. Menyiapkan Prisma untuk Neon

3.1 Pastikan Prisma schema sudah menunjuk ke provider postgresql

packages/shared-auth/prisma/schema.prisma (atau apps/web/prisma/schema.prisma tergantung tempatnya) harus mengandung:

prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

3.2 Generate Prisma Client (opsional, untuk verifikasi lokal)

# Dari root workspace
npx prisma generate   # menghasilkan @prisma/client di tiap package yang memakai Prisma

3.3 Push schema ke Neon (migrasi awal)

# Pastikan .env lokal berisi DATABASE_URL dari Neon
echo "DATABASE_URL=<string_yang_didapat_di_atas>" > .env   # atau tambah ke .env.local

# Jalankan migrasi
npx prisma db push   # akan membuat tabel sesuai schema tanpa menghasilkan file migrasi
# Atau, jika pakai migrasi berbasis file:
npx prisma migrate dev --name init

Verifikasi di Neon console → Tables bahwa tabel-tabel seperti User, Session, dll sudah terbuat.

---
4. Menyiapkan Proyek di Vercel

4.1 Import Repository

1. Di Vercel Dashboard → New Project → Import Git Repository.
2. Pilih repo Storva (atau nama repo Anda).
3. Import → Vercel akan mendeteksi bahwa ini adalah proyek Node/Next.js.

4.2 Set Root Directory (Opsional)

Karena ini Turborepo, Anda memiliki dua pilihan:

┌────────────────────┬────────────────────────────────────────────────────────┬────────────────────────────────────────────────┐
│      Pilihan       │                       Keuntungan                       │                  Cara Setting                  │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ Biarkan root       │ Vercel menjalankan perintah dari root repo; kita cukup │ Tidak perlu mengatur apa‑apa.                  │
│ kosong (default)   │  tentukan build command yang membangun apps/web.       │                                                │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ Set Root Directory │ Lebih sederhana jika tidak ingin menentukan perintah   │ Pada halaman proyek Vercel → Settings →        │
│  ke apps/web       │ khusus.                                                │ General → Root Directory → tulis apps/web →    │
│                    │                                                        │ Save.                                          │
└────────────────────┴────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘

▎ Saya menyarankan pilihan pertama karena lebih fleksibel (bisa menambahkan perintah lint, test, atau build paket lain jika diperlukan nanti).

4.3 Tentukan Build Command

Karena kita pakai Prisma, kita harus menjalankan prisma generate dan migrasi sebelum next build.

Buka Settings → Build & Development Settings → Build Command dan isi:

# Opsi A: menggunakan prisma migrate deploy (migrasi berbasis file)
npx prisma generate && npx prisma migrate deploy && next build

# Opsi B: menggunakan prisma db push (tidak menghasilkan file migrasi)
# npx prisma generate && npx prisma db push && next build

Jika Anda menggunakan Turborepo dan perintah build berada di package.json root, Anda dapat pakai:

npx prisma generate && npx prisma migrate deploy && turbo run build --filter=@storva/web

▎ Catatan: prisma migrate deploy membutuhkan bahwa Anda sudah memiliki folder migrasi (prisma/migrations/). Jika belum pernah generate migrasi, jalankan sekali secara lokal:
▎ npx prisma migrate dev --name init
▎ lalu commit folder prisma/migrations/ ke Git sebelum push ke Vercel.

4.4 Tambahkan Environment Variables

Di Vercel Dashboard → proyek Anda → Settings → Environment Variables → Add:

┌──────────────────────────┬──────────────────────────────┬──────────────────────────────────────────┐
│           Name           │ Value (copy dari .env lokal) │           Target (Environment)           │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
│ DATABASE_URL             │ <string Neon connection>     │ Production (dan Preview jika diinginkan) │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
│ JWT_SECRET               │ <string acak 32+ karakter>   │ Production                               │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
│ NEXT_PUBLIC_* (jika ada) │ nilai sesuai                 │ Production (dan Preview)                 │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
│ ANY_OTHER_VAR            │ nilai dari .env              │ Production                               │
└──────────────────────────┴──────────────────────────────┴──────────────────────────────────────────┘

▎ Pastikan Anda men‑centang “Expose to Browser” hanya untuk variabel yang dimulai dengan NEXT_PUBLIC_*. Variabel seperti DATABASE_URL dan JWT_SECRET harus tetap private (tidak dicentang).

Klik Save untuk masing‑masing variabel.

---
5. Deploy

1. Kembali ke tab Deployments → klik Deploy (atau cukup push baru ke branch yang terhubung, Vercel akan otomatis mendeploy).
2. Vercel akan:
  - Mengclone repo.
  - Menjalankan perintah build yang kita tentukan (prisma generate, prisma migrate deploy, next build).
  - Menyajikan output build di .vercel/output.

3. Setelah build selesai, Vercel akan memberikan URL produksi, contoh: https://storva-git-main-nuhastudio-ai.vercel.app.

5.1 Verifikasi Migrasi Otomatis

Jika Anda menggunakan prisma migrate deploy pada build command, Vercel akan otomatis menjalankan migrasi sebelum memulai server.

Untuk memastikan, buka Logs dari deployment terbaru dan cari baris seperti:

✔ Prisma schema loaded from prisma/schema.prisma
✔ 2 migrations applied (etc.)

Jika tidak ada error, berarti tabel telah dibuat/update di Neon.

5.2 Jika Menggunakan prisma db push

Pada langkah build, prisma db push akan menyesuaikan skema langsung ke database tanpa membuat file migrasi. Setelah deploy, Anda bisa langsung membuka aplikasi dan melakukan operasi DB (mis. register user) untuk memastikan koneksi bekerja.

---
6. Post‑Deployment Checklist

┌────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│        Item        │                                              Cara Memeriksa                                              │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Aplikasi terbuka   │ Buka URL Vercel, pastikan halaman utama muncul tanpa error 500.                                          │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Koneksi DB         │ Coba fitur yang membutuhkan DB (mis. login/register). Cek logs Vercel untuk error Pxxxx (Prisma).        │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Variabel Env       │ Di Vercel → Environment Variables, pastikan tidak ada yang kosong atau salah ketik.                      │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Header Security    │ Buka devtools → Network → lihat response header; pastikan ada Strict-Transport-Security,                 │
│                    │ Content-Security-Policy (dari next.config.ts).                                                           │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Preview            │ Jika Anda mengaktifkan Preview Environments, setiap pull request akan mendapat deploy preview dengan env │
│ Deployments        │  terisolasi (bisa gunakan variabel yang sama atau buat .env.preview).                                    │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Automatic RBAC     │ Neon mendukung role-based access; pastikan user yang digunakan dalam DATABASE_URL memiliki hak CREATE,   │
│ (opsional)         │ ALTER, DROP bila menggunakan migrasi otomatis.                                                           │
└────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---
7. Troubleshooting Umum

┌──────────────────────────────────────────┬───────────────────────────┬────────────────────────────────────────────────────────┐
│                 Masalah                  │   Kemungkinan Penyebab    │                         Solusi                         │
├──────────────────────────────────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│                                          │ DATABASE_URL salah, Neon  │ Periksa string di Vercel Env, buat project Neon baru   │
│ Error: P1001 (Can't reach database)      │ belum aktif, atau IP      │ jika perlu, aktifkan Allow all IPv4 addresses di Neon  │
│                                          │ di‑blokir.                │ console (atau gunakan pooled connection).              │
├──────────────────────────────────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│ Error: P3000                             │ Prisma client belum       │ Pastikan npx prisma generate ada di build command dan  │
│ (PrismaClientInitializationError)        │ generate.                 │ tidak error. Cek log build untuk output prisma         │
│                                          │                           │ generate.                                              │
├──────────────────────────────────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│ Migration gagal: duplicate key value     │ Migrasi sudah dijalankan  │ Hapus folder prisma/migrations/ dan buat migrasi baru  │
│ violates unique constraint               │ sebelumnya tetapi skema   │ (prisma migrate dev --name reset), lalu push ke repo.  │
│                                          │ lokal tidak sinkron.      │                                                        │
├──────────────────────────────────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│                                          │ prisma generate mengunduh │ Aktifkan cache Vercel (default) atau gunakan Prisma    │
│ Build lama atau timeout (> 10 menit)     │  binary besar setiap      │ binary yang sudah di‑commit (tidak disarankan) – lebih │
│                                          │ build.                    │  baik tetap memperbolehkan download, Vercel biasanya   │
│                                          │                           │ cukup cepat.                                           │
├──────────────────────────────────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│ Variabel NEXT_PUBLIC_* tidak terlihat di │ Variabel tidak diawali    │ Ganti nama variabel sehingga diawali NEXT_PUBLIC_ dan  │
│  browser                                 │ NEXT_PUBLIC_ atau tidak   │ centang Expose to Browser di Vercel Env.               │
│                                          │ di‑expose.                │                                                        │
└──────────────────────────────────────────┴───────────────────────────┴────────────────────────────────────────────────────────┘

---
8. Alur Kerja Direkomendasikan (Git‑based)

1. Feature branch → buat perubahan (mis. tambah fitur, ubah schema Prisma).
2. Lokal:
npx prisma migrate dev --name nama_fitur   # membuat file migrasi
npx prisma generate
npm run test   # bila ada
3. Commit & push ke branch fitur.
4. Pull request → Vercel otomatis membuat Preview Deployment (pakai env yang sama atau buat .env.preview).
5. Review → bila OK, merge ke main.
6. Main branch déclencuh produksi otomatis di Vercel (migrasi otomatis jalan via prisma migrate deploy).
7. Monitor di Vercel → Deployments → cek logs dan URL produksi.

---
9. Ringkasan Perintah Kunci (Untuk Referensi Cepat)

# 1. Setup env lokal (simpan di .env)
echo "DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require" > .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 2. Generate & push schema (lokal)
npx prisma generate
npx prisma db push          # atau: npx prisma migrate dev --name init

# 3. Commit perubahan (termasuk folder prisma/migrations/ bila pakai migrasi)
git add .
git commit -m "add feature X + prisma schema"
git push origin feature/xyz

# 4. Di Vercel: set build command ( contoh )
# npx prisma generate && npx prisma migrate deploy && next build

---
Selamat!

Sekarang aplikasi Storva Anda dapat di‑deploy ke Vercel dengan database Neon PostgreSQL secara otomatis dan aman. Selamat mencoba, dan jangan ragu untuk membuka issue di GitHub repo jika menemukan hal yang perlu ditingkatkan lebih jauh. 🚀