# Bikin Storva Bisa "Deploy Sendiri" Tanpa Command Line (buat user lain)

Tujuan: user lain cukup **klik-klik di browser** (tanpa `git clone`/`git push` manual) untuk punya instance Storva sendiri — **dan** bisa ikut update saat kalian merilis perubahan baru, juga tanpa command line.

---


## Langkah 1 — User lain: Fork (JANGAN pakai "Use this template" / tombol Deploy)

> ⚠️ **Koreksi penting**: baik fitur **"Use this template"** di GitHub maupun tombol **"Deploy with Vercel"**, dua-duanya menghasilkan salinan yang **terputus total** dari repo asli — tidak ada cara resmi untuk menariknya update lagi setelahnya. Supaya user bisa update, mereka harus pakai **Fork** biasa (tombol di kanan atas halaman repo), yang tetap mengingat "berasal dari mana".

Instruksikan ke user lain:

1. Buka `https://github.com/nuhastudio-ai/STORVA-v2`
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
