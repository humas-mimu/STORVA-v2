# STORVA — Petunjuk Instalasi & Pengujian (V2)

> **Panduan ini menggantikan `PETUNJUK_INSTALASI.md` lama untuk build STORVA yang sudah menggunakan persistent data external dan Web di port `8787`.**
>
> Target OS: **Windows, macOS, dan Linux**.

---

## 1. Arsitektur yang Digunakan

STORVA terdiri dari dua service lokal:

```text
Browser
   │
   ▼
http://localhost:8787
   │
   ▼
STORVA Web (Next.js)
   │
   ▼
http://127.0.0.1:5125
   │
   ▼
STORVA Agent
   │
   ▼
Folder Storage User
```

Port:

| Service | Port default | Fungsi |
|---|---:|---|
| STORVA Web | **8787** | UI + API/control plane |
| STORVA Agent | **5125** | Akses filesystem/storage lokal |

**Jangan menganggap port 5125 sebagai port web.** Browser membuka `http://localhost:8787`.

---

## 2. Persyaratan Sistem

### 2.1 Node.js

Gunakan Node.js **v22**.

Cek:

```bash
node -v
```

Jika menggunakan NVM:

```bash
nvm install 22
nvm use 22
```

### 2.2 pnpm

```bash
npm install -g pnpm
```

Cek:

```bash
pnpm -v
```

### 2.3 Git

Pastikan Git tersedia:

```bash
git --version
```

### 2.4 Build tools / native dependencies

STORVA menggunakan beberapa package Node dengan komponen native seperti `argon2`, `better-sqlite3`, dan `sharp`.

Pada **Windows**, bila `pnpm install` gagal saat compile/install native package, pasang:

- Python 3
- Visual Studio Build Tools dengan workload **Desktop development with C++**
- Windows SDK

Pada **macOS**, pastikan Xcode Command Line Tools tersedia:

```bash
xcode-select --install
```

Pada **Linux Debian/Ubuntu**, siapkan toolchain dasar bila diperlukan:

```bash
sudo apt update
sudo apt install -y build-essential python3
```

---

## 3. Clone / Extract Project

Jika dari Git:

```bash
git clone <URL-REPO-STORVA>
cd <FOLDER-STORVA>
```

Jika menggunakan ZIP, extract project lalu masuk ke root project, yaitu folder yang berisi:

```text
package.json
pnpm-workspace.yaml
apps/
packages/
prisma/
scripts/
```

---

## 4. Install Dependency

pnpm install

> **Otomatis:** `pnpm install` menjalankan seluruh setup project yang aman: install dependency, generate Prisma Client, inisialisasi persistent data bila belum ada dan aman, lalu menjalankan pengecekan persistent data.
>
> **Tetap manual:** Git, Node.js, pnpm, build tools/native dependencies OS, serta PostgreSQL migration.

### Catatan penting

Tidak perlu menjalankan `prisma generate` secara manual untuk instalasi normal. Jika `pnpm install` mendeteksi database lama, storage yang sudah berisi file, atau kondisi yang berisiko membuat metadata terputus dari file, installer akan berhenti dan meminta proses migrasi/restore yang eksplisit.

Untuk PostgreSQL production, migration juga **tidak** dijalankan otomatis. Jalankan secara eksplisit setelah konfigurasi database siap:

```bash
pnpm prisma:migrate
```

Jika hanya ingin menjalankan ulang pengecekan persistent data:

```bash
pnpm storva:data:check
```

## 5. Konfigurasi Environment Web

Buat:

```text
apps/web/.env.local
```

Gunakan `apps/web/.env.example` sebagai template.

Minimal untuk local development:

```env
DATABASE_URL=""

# Opsional. Kosongkan agar STORVA memilih lokasi data default OS.
STORVA_DATA_DIR=""

SIGNING_PRIVATE_KEY="ganti-dengan-secret-random-minimal-32-karakter"
STORVA_AGENT_URL="http://127.0.0.1:5125"
NEXT_PUBLIC_APP_URL="http://localhost:8787"

ADMIN_USERNAME="admin"
ADMIN_PASSWORD="ganti-password"
```

### Penting

`DATABASE_URL=""` berarti mode development tanpa PostgreSQL. STORVA memakai **database JSON persisten di luar source code**.

`NEXT_PUBLIC_APP_URL` untuk local harus menggunakan:

```text
http://localhost:8787
```

Bukan `3000`, `3125`, atau `6969`.

---

## 6. Konfigurasi Environment Agent

Buat:

```text
apps/agent/.env
```

Contoh Windows:

```env
STORVA_STORAGE_PATH="D:\\Storva"
STORVA_AGENT_PORT=5125
STORVA_AGENT_HOST=127.0.0.1
```

Contoh macOS:

```env
STORVA_STORAGE_PATH="/Users/USERNAME/Storva"
STORVA_AGENT_PORT=5125
STORVA_AGENT_HOST=127.0.0.1
```

Contoh Linux:

```env
STORVA_STORAGE_PATH="/home/USERNAME/Storva"
STORVA_AGENT_PORT=5125
STORVA_AGENT_HOST=127.0.0.1
```

Folder `STORVA_STORAGE_PATH` adalah **folder file sebenarnya**, bukan database metadata.

Jangan memasukkan database JSON ke folder storage tersebut.

---

## 7. Persistent Database Lokal

Untuk local/mock mode, database STORVA berada di luar source aplikasi.

Struktur:

```text
<STORVA_DATA_DIR>/
├── database/
│   └── dev-db.json
├── backups/
└── system/
    └── manifest.json
```

Data penting yang disimpan di database antara lain:

```text
users
sessions
devices
file_metadata
activities
upload_sessions
download_sessions
share_links
privacy_rules
```

### Lokasi default menurut OS

#### Windows

```text
%LOCALAPPDATA%\Storva\data
```

Contoh:

```text
C:\Users\Nama\AppData\Local\Storva\data
```

Fallback yang tersedia bila `LOCALAPPDATA` tidak ada:

```text
%PROGRAMDATA%\Storva\data
```

#### macOS

```text
~/Library/Application Support/Storva/data
```

#### Linux

Bila `XDG_STATE_HOME` tersedia:

```text
$XDG_STATE_HOME/storva
```

Jika tidak:

```text
~/.local/state/storva
```

---

## 8. Sangat Disarankan: Tentukan `STORVA_DATA_DIR` Secara Eksplisit

Untuk komputer yang akan dipakai jangka panjang, lebih mudah menggunakan lokasi eksplisit.

### Windows PowerShell

```powershell
$env:STORVA_DATA_DIR = 'C:\ProgramData\Storva\data'
```

### macOS / Linux

```bash
export STORVA_DATA_DIR="$HOME/StorvaData"
```

Kemudian pastikan directory ini berada **di luar source application**.

Contoh yang benar:

```text
C:\ProgramData\Storva\data     ← DATA PERSISTEN
C:\Projects\storva             ← SOURCE CODE
D:\Storva                       ← FILE STORAGE
```

Contoh yang salah:

```text
C:\Projects\storva\apps\web\.storva-data
```

STORVA akan menolak `STORVA_DATA_DIR` yang berada di dalam source tree.

---

## 9. Migrasi dari STORVA Versi Lama

Jika instalasi lama masih memiliki database seperti:

```text
apps/web/dev-db.json
```

**Migrasikan sebelum mengganti source code lama.**

Dari root project:

```bash
pnpm storva:data:migrate-legacy
```

Kemudian cek:

```bash
pnpm storva:data:check
```

Migrasi akan:

1. mencari database legacy yang berisi state nyata;
2. menolak menimpa database persistent yang sudah ada;
3. membuat backup database lama;
4. menyalin database ke `STORVA_DATA_DIR/database/dev-db.json`;
5. membuat `system/manifest.json`.

STORVA juga memiliki fallback one-time migration saat startup ketika database persistent belum ada dan database legacy masih ditemukan.

Untuk proses upgrade/installer, **lebih aman menggunakan command migrasi secara eksplisit** terlebih dahulu.

---

## 10. Inisialisasi Persistent Database

Untuk instalasi STORVA baru, gunakan command ini **sebelum** `storva:data:check`:

```bash
pnpm storva:data:init
```

Command ini membuat database metadata kosong di `STORVA_DATA_DIR` jika belum ada. Command akan menolak membuat database kosong apabila mendeteksi database legacy yang berisi state nyata atau file user yang sudah ada di storage terkonfigurasi.

Setelah berhasil, jalankan:

```bash
pnpm storva:data:check
```

Pada instalasi baru, hasil check kemudian harus menunjukkan:

```text
[STORVA] Database exists: YES
[STORVA] Persistent database looks readable.
```

## 10. Cek Persistent Database

Jalankan:

```bash
pnpm storva:data:check
```

Command ini mengecek:

- lokasi persistent data;
- database tersedia;
- JSON database dapat dibaca;
- collection wajib tersedia;
- format database.

Collection yang dicek:

```text
users
sessions
devices
file_metadata
activities
upload_sessions
download_sessions
share_links
privacy_rules
```

---

## 11. Backup Sebelum Update

Sebelum mengganti source code STORVA:

```bash
pnpm storva:data:preupdate
```

Command ini melakukan:

```text
cek database
   ↓
validasi collection
   ↓
buat backup
   ↓
verifikasi backup
   ↓
update aman diperbolehkan
```

Backup berada di:

```text
<STORVA_DATA_DIR>/backups/
```

Backup manual juga tersedia:

```bash
pnpm storva:data:backup
```

---

## 12. Jalankan STORVA Lokal

Buka **dua terminal** dari root project.

### Terminal 1 — Agent

```bash
pnpm dev:agent
```

Harus mendengarkan di:

```text
http://127.0.0.1:5125
```

### Terminal 2 — Web

```bash
pnpm dev:web
```

Web STORVA tersedia di:

```text
http://localhost:8787
```

### Tes cepat

Buka browser:

```text
http://localhost:8787
```

---

## 13. Urutan Pengujian yang Disarankan

Setelah login, lakukan pengujian berikut:

```text
1. Buat folder
2. Upload file
3. Favorite file
4. Jadikan file/folder private
5. Buat share link
6. Logout
7. Login kembali
8. Pastikan semua state masih ada
```

Periksa terutama:

```text
✅ file metadata
✅ privacy rule
✅ share link
✅ favorite
✅ user
✅ activity
```

---

## 14. Simulasi Update Aplikasi

Ini adalah pengujian utama persistent-data.

### Sebelum update

Pastikan:

```bash
pnpm storva:data:preupdate
```

Kemudian matikan STORVA.

### Ganti source code

Replace source application dengan versi baru.

**Jangan hapus atau replace `STORVA_DATA_DIR`.**

Contoh:

```text
C:\Projects\storva\          ← boleh diganti
C:\ProgramData\Storva\data\  ← jangan diganti
D:\Storva\                    ← jangan diganti
```

### Setelah update

Install dependency bila diperlukan:

```bash
pnpm install
```

Generate Prisma:

```bash
pnpm --filter @storva/web exec prisma generate --schema ../../prisma/schema.prisma
```

Validasi data:

```bash
pnpm storva:data:check
```

Jalankan:

```bash
pnpm dev:agent
```

Terminal kedua:

```bash
pnpm dev:web
```

Buka:

```text
http://localhost:8787
```

Pastikan state lama tetap ada.

---

## 15. Database Hilang tetapi Storage Masih Ada

STORVA memiliki safety guard.

Jika kondisi berikut terjadi:

```text
STORVA_STORAGE_PATH
    ↓
masih berisi file user

STORVA_DATA_DIR/database/dev-db.json
    ↓
hilang
```

STORVA **tidak akan otomatis membuat database kosong**.

Startup akan dihentikan untuk mencegah kasus:

```text
database hilang
↓
database kosong dibuat
↓
user login
↓
privacy/share tampak hilang
```

Solusi yang benar adalah restore/migrate database lama.

### Exception untuk instalasi baru

Jika memang sengaja membuat metadata database baru untuk storage yang sudah berisi file, gunakan hanya untuk proses initialization yang benar-benar disengaja:

```text
STORVA_ALLOW_EMPTY_DB=true
```

Gunakan hanya satu kali, setelah memastikan tidak ada database lama yang perlu direstore.

---

## 16. Format Data dan Migration Guard

Persistent database memiliki format version.

Saat aplikasi lebih baru daripada database:

```text
Database version <= Application version
        ↓
aman untuk dibuka / dimigrasikan
```

Jika database ternyata lebih baru daripada aplikasi:

```text
Database version > Application version
        ↓
startup ditolak
```

Tujuannya agar aplikasi lama tidak membuka dan merusak data yang dibuat oleh versi lebih baru.

---

## 17. PostgreSQL Production

Untuk production, gunakan PostgreSQL sebagai database utama.

```env
DATABASE_URL="postgresql://..."
```

Kemudian:

```bash
pnpm --filter @storva/web exec prisma migrate deploy
```

**Jangan gunakan `prisma migrate reset` pada production.**

Persistent JSON database adalah untuk local/mock/self-hosted development mode, bukan pengganti PostgreSQL production.

---

## 18. Deployment ke Vercel

Vercel dapat digunakan untuk Web App / control plane dengan PostgreSQL eksternal.

Set environment variable yang relevan di Vercel, termasuk:

```text
DATABASE_URL
SIGNING_PRIVATE_KEY
STORVA_AGENT_URL
NEXT_PUBLIC_APP_URL
```

Untuk production, database sebaiknya menggunakan PostgreSQL managed/external.

**Jangan mengandalkan `STORVA_DATA_DIR` JSON local sebagai database persistent utama di filesystem instance Vercel.**

Agent tetap berjalan di mesin/storage milik user dan diakses menggunakan konektivitas yang sesuai, misalnya tunnel/private network.

---

## 19. Operating System Support

Build STORVA ini ditujukan untuk:

```text
Windows ✅
macOS   ✅
Linux   ✅
```

Perbedaan utama adalah:

1. lokasi default persistent data;
2. path filesystem storage;
3. toolchain native dependency.

Environment variable memungkinkan lokasi data dan storage ditentukan secara eksplisit.

---

## 20. Troubleshooting

### Web masih muncul di port 3000

Pastikan menjalankan:

```bash
pnpm dev:web
```

dan gunakan:

```text
http://localhost:8787
```

Periksa `apps/web/package.json`; script development STORVA saat ini menggunakan port `8787`.

### Agent tidak terhubung

Periksa:

```env
STORVA_AGENT_URL="http://127.0.0.1:5125"
```

Kemudian pastikan Agent aktif:

```bash
pnpm dev:agent
```

### Database dianggap hilang

Jalankan:

```bash
pnpm storva:data:check
```

Periksa nilai `STORVA_DATA_DIR`.

Pastikan service dan terminal admin menggunakan environment yang sama.

### Tidak boleh memulai dengan database kosong

Jika storage sudah memiliki file, jangan menghapus `dev-db.json` dan jangan langsung membuat database baru.

Cari backup di:

```text
<STORVA_DATA_DIR>/backups/
```

### Native dependency gagal saat `pnpm install`

Pasang toolchain OS yang sesuai lalu ulangi:

```bash
pnpm install
```

### Prisma gagal dijalankan di Windows

Gunakan perintah berikut dari root project:

```powershell
pnpm --filter @storva/web exec prisma generate --schema ../../prisma/schema.prisma
```

Jangan gunakan `prisma generate` langsung karena executable Prisma tidak harus tersedia di PATH Windows.

---

## 21. Checklist Sebelum Dianggap Siap

```text
[ ] pnpm install berhasil
[ ] Prisma generate berhasil
[ ] Agent berjalan di 5125
[ ] Web berjalan di 8787
[ ] Login berhasil
[ ] Upload berhasil
[ ] Private rule tersimpan
[ ] Share link tersimpan
[ ] Logout/login tidak menghilangkan state
[ ] storva:data:check berhasil
[ ] storva:data:preupdate berhasil
[ ] Backup berhasil dibaca kembali
[ ] Simulasi update tidak menghapus state
[ ] Database missing + storage berisi file ditolak
[ ] Restore backup berhasil
```

---

## Prinsip Utama STORVA

```text
APPLICATION CODE IS REPLACEABLE.
USER STATE IS NOT.
```

Source code boleh di-update atau diganti.

Database persistent, metadata file, privacy rules, share links, konfigurasi penting, dan storage user harus diperlakukan sebagai **user state** yang terpisah dari source application.
