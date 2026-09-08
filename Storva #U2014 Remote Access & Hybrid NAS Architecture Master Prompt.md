# STORVA — YOUR PERSONAL STORAGE

## ADVANCED ARCHITECTURE & REMOTE ACCESS MASTER PROMPT

Saya sedang mengembangkan aplikasi bernama:

**STORVA**  
**Your Personal Storage**

Storva adalah **self-hosted Personal NAS / Private Cloud Web Application** yang menggunakan komputer rumah sebagai penyimpanan utama.

Aplikasi web akan dideploy melalui:

**GitHub → Vercel**

Namun file NAS TIDAK disimpan di Vercel.

Filesystem utama tetap berada di:

```text
Windows PC Rumah
D:\Storva
```

atau path lain yang ditentukan melalui konfigurasi.

Aplikasi harus dapat digunakan dalam dua kondisi:

### LOCAL ACCESS

Ketika berada di rumah:

```text
Laptop / HP
      ↓
WiFi / LAN
      ↓
PC Storva
      ↓
D:\Storva
```

### REMOTE ACCESS

Ketika berada di luar rumah:

```text
HP / Laptop
      ↓
Internet
      ↓
Storva Web App
      ↓
Secure Remote Access
      ↓
Storva Agent di PC Rumah
      ↓
D:\Storva
```

---

# 1. TUJUAN UTAMA

Saya tidak ingin Storva hanya menjadi UI file manager.

Storva harus menjadi sistem NAS yang benar-benar dapat:

- menyimpan file di komputer rumah
- upload file
- download file
- membuat folder
- rename
- copy
- move
- delete
- restore
- preview
- search
- favorite
- sharing
- authentication
- storage statistics
- activity logging
- akses LAN
- akses remote dari internet

Semua operasi file harus dilakukan terhadap filesystem PC rumah secara nyata.

Tidak boleh menggunakan dummy data.

---

# 2. ARSITEKTUR UTAMA

Gunakan arsitektur:

**Hybrid Cloud + Self-Hosted Storage**

Pisahkan sistem menjadi tiga bagian:

```text
                    ┌──────────────────────┐
                    │       VERCEL         │
                    │                      │
                    │ Storva Web Frontend  │
                    │ Authentication       │
                    │ Control Plane        │
                    │ Metadata API         │
                    └──────────┬───────────┘
                               │
                               │ HTTPS
                               │
                    ┌──────────▼───────────┐
                    │   REMOTE ACCESS      │
                    │ Cloudflare Tunnel    │
                    │ / Optional Tailscale │
                    └──────────┬───────────┘
                               │
                               │
                    HOME NETWORK
                               │
                    ┌──────────▼───────────┐
                    │      HOME PC         │
                    │                      │
                    │    Storva Agent      │
                    │         │            │
                    │         ▼            │
                    │     D:\Storva        │
                    └──────────────────────┘
```

---

# 3. VERCEL BUKAN FILE STORAGE

Ini adalah aturan arsitektur yang sangat penting.

Jangan pernah menyimpan file NAS utama ke:

```text
Vercel filesystem
```

Jangan membuat desain:

```text
Browser
   ↓
Vercel
   ↓
Storage file
```

karena file NAS harus tetap berada di PC rumah.

Vercel hanya digunakan untuk:

```text
Frontend
Authentication
User management
Metadata
Settings
API/control plane
Remote connection authorization
```

Storage binary:

```text
PC Rumah
D:\Storva
```

---

# 4. KOMPONEN SISTEM

Buat minimal 4 komponen.

## COMPONENT A — STORVA WEB

Deploy ke Vercel.

Teknologi:

- Next.js
- TypeScript
- Tailwind CSS
- React
- TanStack Query
- Lucide Icons
- Recharts

Contoh:

```text
https://storva.example.com
```

Fungsi:

- login
- dashboard
- file manager UI
- storage dashboard
- search
- settings
- activity
- upload manager
- download manager
- remote connection manager

---

# 5. COMPONENT B — STORVA CLOUD CONTROL PLANE

Berjalan di Vercel.

Tugas:

```text
Authentication
User account
Session
Device registration
Agent registration
Connection authorization
Metadata
Audit log
Settings
Remote connection token
```

Contoh API:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/devices
POST /api/devices/register

POST /api/connection/session
POST /api/connection/revoke

GET  /api/storage/status
GET  /api/activity
```

Jangan letakkan filesystem operation langsung di Vercel.

---

# 6. COMPONENT C — STORVA AGENT

Ini adalah aplikasi kecil yang dipasang pada PC rumah.

Nama:

**Storva Agent**

Fungsinya menjadi jembatan antara:

```text
Storva Web
        ↕
Storva Agent
        ↕
Windows Filesystem
```

Agent berjalan sebagai background service.

Contoh:

```text
Windows
   ↓
Storva Agent
   ↓
http://127.0.0.1:3080
```

Agent memiliki akses ke:

```text
D:\Storva
```

tetapi TIDAK boleh memiliki akses arbitrary ke seluruh filesystem.

---

# 7. AGENT HARUS MENJADI COMPONENT TERPISAH

Jangan mengandalkan server Node.js yang menjalankan frontend.

Pisahkan:

```text
/apps/web
/apps/agent
/packages/shared
```

Contoh:

```text
storva/
│
├── apps/
│   ├── web/
│   └── agent/
│
├── packages/
│   ├── types/
│   ├── validation/
│   └── protocol/
│
├── prisma/
│
└── README.md
```

---

# 8. MONOREPO

Gunakan monorepo.

Rekomendasi:

```text
pnpm
Turborepo
TypeScript
```

Contoh:

```text
apps/
  web/
  agent/

packages/
  shared-types/
  protocol/
  config/
  validation/
```

Dengan ini frontend dan agent dapat menggunakan type/interface yang sama.

---

# 9. STORVA AGENT — FILESYSTEM

Agent harus mempunyai konfigurasi:

```env
STORVA_STORAGE_PATH=D:\Storva
STORVA_AGENT_PORT=3080
STORVA_AGENT_HOST=127.0.0.1
```

Pada Linux:

```env
STORVA_STORAGE_PATH=/home/user/Storva
```

Path tidak boleh di-hardcode.

---

# 10. FILESYSTEM SANDBOX

Agent hanya boleh bekerja di dalam:

```text
STORVA_STORAGE_PATH
```

Contoh:

```text
D:\Storva
```

Tidak boleh mengakses:

```text
C:\
C:\Windows
C:\Users
D:\Documents
D:\Program Files
```

kecuali directory tersebut memang dikonfigurasi sebagai storage root.

Wajib membuat utility:

```text
resolveSafePath()
```

Semua path operation harus melewati utility tersebut.

Proteksi:

```text
../
../../
..\..\ 
absolute path
UNC path
symbolic link abuse
junction abuse
path traversal
```

---

# 11. WINDOWS PATH SECURITY

Berikan perhatian khusus terhadap:

```text
C:\
D:\
UNC path
junction
symbolic link
reparse point
```

Jangan hanya melakukan string check sederhana.

Pastikan resolved filesystem path benar-benar berada di bawah storage root.

---

# 12. STORVA AGENT COMMUNICATION

Storva Agent harus dapat melakukan komunikasi aman dengan Storva Cloud.

Jangan membuat agent membuka arbitrary public port.

Prefer:

```text
OUTBOUND CONNECTION
```

Contoh:

```text
Storva Agent
     │
     │ HTTPS outbound
     ▼
Storva Cloud
```

Agent harus melakukan registration menggunakan:

```text
device_id
device_name
public_key
agent_version
```

---

# 13. DEVICE IDENTITY

Setiap Storva Agent mempunyai:

```text
device_id
device_name
public_key
created_at
last_seen
agent_version
```

Jangan menggunakan password statis sebagai identity agent.

Gunakan public/private key pair.

Private key:

```text
ONLY ON HOME PC
```

Public key:

```text
Cloud control plane
```

---

# 14. DEVICE REGISTRATION

Saat pertama kali agent dijalankan:

```text
Welcome to Storva Agent

Device Name:
[ Home PC ]

Storage:
D:\Storva

[ Register Device ]
```

Setelah registration:

```text
Device Registered

Device:
Home PC

Status:
Online

Storage:
D:\Storva

Agent:
1.0.0
```

---

# 15. FIRST-TIME PAIRING

Gunakan pairing code.

Contoh:

```text
Storva Agent

Pairing Code:

8472-91

This code expires in 10 minutes.
```

Di web:

```text
Settings
→ Devices
→ Add Device

Enter pairing code

8472-91
```

Setelah berhasil:

```text
Home PC
● Online
```

Pairing code harus:

- sekali pakai
- expire
- random
- rate limited

---

# 16. HEARTBEAT

Agent mengirim heartbeat.

Contoh:

```text
POST /api/agent/heartbeat
```

Data:

```text
device_id
version
status
timestamp
storage_status
```

Web menampilkan:

```text
Home PC
● Online

Last seen:
just now
```

Jika heartbeat hilang:

```text
Home PC
○ Offline
```

---

# 17. REMOTE ACCESS

Gunakan pendekatan:

## PRIMARY REMOTE ACCESS

**Cloudflare Tunnel**

Cloudflare Tunnel harus berjalan di PC rumah sebagai service.

Konsep:

```text
Internet
   ↓
Cloudflare
   ↓
Encrypted Tunnel
   ↓
PC Rumah
   ↓
Storva Agent
```

Tidak boleh membutuhkan:

```text
port forwarding
public IPv4
dynamic DNS
```

Cloudflare Tunnel menyediakan koneksi outbound dari origin dan tidak mengharuskan membuka inbound port pada router.

---

# 18. DOMAIN STRUCTURE

Gunakan struktur domain:

```text
storva.example.com
```

untuk Web App.

Gunakan subdomain terpisah untuk remote agent:

```text
agent.example.com
```

atau:

```text
nas.example.com
```

Rekomendasi:

```text
www.storva.example.com
```

untuk application UI.

```text
api.storva.example.com
```

untuk cloud API.

```text
nas.storva.example.com
```

untuk remote/home agent endpoint.

---

# 19. JANGAN PROXY FILE BESAR MELALUI VERCEL

Ini adalah aturan penting.

Untuk file:

```text
1 GB
5 GB
10 GB
```

jangan melakukan:

```text
Browser
 ↓
Vercel
 ↓
Home PC
```

karena Vercel bukan dirancang sebagai binary NAS relay.

Sebisa mungkin:

```text
Browser
   ↓
Remote Transport
   ↓
Storva Agent
   ↓
Filesystem
```

Vercel hanya mengeluarkan authorization/session information.

---

# 20. REMOTE FILE TRANSFER

Gunakan mekanisme:

```text
Direct browser → Storva Agent
```

setelah browser mendapatkan authorization dari Cloud Control Plane.

Untuk download:

```text
Browser
   ↓
Authorized URL
   ↓
Storva Agent
   ↓
createReadStream()
   ↓
D:\Storva\file.ext
```

Support:

```text
HTTP Range Requests
```

agar:

- video dapat seek
- download dapat resume
- file besar lebih stabil

---

# 21. UPLOAD FILE BESAR

Jangan menggunakan:

```text
whole file → memory
```

Gunakan:

```text
stream
chunk
resume
```

Untuk remote upload:

```text
File
 ↓
Chunk 1
Chunk 2
Chunk 3
...
Chunk N
 ↓
Storva Agent
 ↓
Temporary file
 ↓
Final atomic rename
```

Jika koneksi terputus:

```text
Resume upload
```

bukan mengulang dari awal.

---

# 22. ATOMIC FILE OPERATIONS

Untuk file upload:

```text
uploading.tmp
```

setelah sukses:

```text
uploading.tmp
       ↓
final-file.ext
```

Gunakan atomic rename.

Jangan membuat file setengah jadi terlihat sebagai file normal.

---

# 23. REMOTE AUTHORIZATION

Flow:

```text
1. User login ke Storva
2. Web meminta connection session
3. Cloud mengeluarkan short-lived token
4. Browser menggunakan token
5. Agent memvalidasi authorization
6. File operation dilakukan
```

Token harus:

- short-lived
- scoped
- revocable
- tidak mengandung password
- tidak memberikan filesystem access secara bebas

---

# 24. TOKEN SCOPE

Token harus memiliki scope.

Contoh:

```text
storage:read
storage:write
storage:delete
storage:share
```

Untuk download:

```text
storage:read
```

Untuk upload:

```text
storage:write
```

Untuk delete:

```text
storage:delete
```

Jangan gunakan satu token superuser untuk semua operasi.

---

# 25. SIGNED REQUEST

Untuk operasi sensitif:

```text
delete
rename
move
share
```

gunakan signed authorization.

Minimal:

```text
user_id
device_id
operation
resource_id
timestamp
nonce
expiry
signature
```

Agent harus menolak:

```text
expired request
replayed request
invalid signature
unknown device
unknown resource
```

---

# 26. AUTHENTICATION

Gunakan akun Storva:

```text
Email / Username
Password
```

Password:

```text
Argon2id
```

Session:

```text
HttpOnly
Secure
SameSite
```

Tambahkan:

```text
rate limiting
login attempt protection
session expiration
logout all devices
```

---

# 27. OPTIONAL 2FA

Arsitektur harus siap untuk:

```text
TOTP
Passkey
WebAuthn
```

Tidak wajib untuk MVP.

Namun struktur database harus mendukung penambahannya.

---

# 28. REMOTE ACCESS MODES

Storva harus mendukung dua mode remote.

## MODE A — PRIVATE

Gunakan Tailscale.

```text
HP
 ↓
Tailscale
 ↓
Home PC
 ↓
Storva Agent
```

Tailscale Serve dapat membatasi service hanya untuk perangkat dalam tailnet.

Ini menjadi mode keamanan paling tinggi untuk personal use.

---

## MODE B — WEB ACCESS

Gunakan:

```text
Cloudflare Tunnel
```

untuk akses melalui browser biasa tanpa harus memasang Tailscale.

Cloudflare Tunnel bekerja melalui koneksi outbound dan tidak membutuhkan public IP/inbound port.

---

# 29. JANGAN MEMAKSA TAILSCALE SEBAGAI DEPENDENCY WEB APP

Storva Web harus tetap dapat berjalan tanpa Tailscale.

Tailscale adalah transport layer.

Cloudflare juga transport layer.

Application layer tidak boleh bergantung langsung pada salah satu vendor.

---

# 30. CONNECTION MANAGER

Tambahkan halaman:

```text
Settings
→ Connection
```

Tampilkan:

```text
Storva Connection

Local Network
● Available

Remote Access
● Connected

Storage
● Online

Agent
● Online
```

---

# 31. CONNECTION AUTO-DETECTION

Web application mencoba menentukan:

```text
LOCAL
REMOTE
OFFLINE
```

Contoh:

```text
LOCAL

http://192.168.1.100:3080
```

atau:

```text
REMOTE

https://nas.storva.example.com
```

Tetapi jangan bergantung pada asumsi subnet.

Gunakan connection health check.

---

# 32. LOCAL ACCESS

Saat perangkat berada pada jaringan rumah:

```text
Browser
 ↓
192.168.1.100
 ↓
Storva Agent
```

Jangan mengirim traffic melalui Cloudflare jika local direct connection dapat digunakan.

Tujuan:

```text
lower latency
higher transfer speed
lower bandwidth usage
```

---

# 33. REMOTE ACCESS

Saat perangkat berada di luar:

```text
Browser
 ↓
HTTPS
 ↓
Cloudflare
 ↓
Tunnel
 ↓
Storva Agent
```

Pastikan tidak ada port terbuka langsung ke internet pada router rumah.

---

# 34. FILE DOWNLOAD FLOW

Contoh:

User klik:

```text
Download movie.mp4
```

Flow:

```text
Web App
  ↓
Request signed download session
  ↓
Cloud Control Plane
  ↓
Signed session
  ↓
Browser → Remote Agent
  ↓
Agent validates token
  ↓
Agent opens safe path
  ↓
createReadStream()
  ↓
Browser
```

Support:

```text
Range
206 Partial Content
Content-Length
Content-Type
Content-Disposition
```

---

# 35. FILE UPLOAD FLOW

```text
User selects file
       ↓
Create upload session
       ↓
Receive upload ID
       ↓
Chunk upload
       ↓
Agent validates chunk
       ↓
Temporary storage
       ↓
Checksum
       ↓
Atomic rename
       ↓
Database metadata
       ↓
Activity log
```

---

# 36. CHECKSUM

File upload mendukung:

```text
SHA-256
```

Gunakan checksum untuk:

- integrity
- resume
- duplicate detection
- verification

---

# 37. DUPLICATE FILES

Jika:

```text
photo.jpg
```

sudah ada:

```text
Replace
Keep Both
Cancel
```

jangan overwrite otomatis.

---

# 38. STORAGE METADATA

Cloud database menyimpan metadata minimum:

```text
file_id
device_id
parent_id
name
relative_path
size
mime_type
extension
checksum
created_at
updated_at
deleted_at
```

Jangan menyimpan:

```text
C:\Users\User\...
```

sebagai canonical path.

Simpan relative path:

```text
Photos/2026/holiday.jpg
```

---

# 39. IMPORTANT: RELATIVE PATH

Database:

```text
Photos/holiday.jpg
```

Agent menentukan:

```text
D:\Storva\Photos\holiday.jpg
```

Jangan membuat database bergantung pada:

```text
D:
E:
C:
```

sehingga storage root dapat dipindahkan.

---

# 40. DATABASE

Gunakan database cloud untuk:

```text
users
sessions
devices
file_metadata
folders
activities
favorites
share_links
upload_sessions
download_sessions
```

Rekomendasi database:

```text
PostgreSQL
```

Bisa menggunakan:

```text
Supabase
Neon
Vercel Marketplace PostgreSQL
```

Jangan menggunakan SQLite sebagai database utama jika metadata harus digunakan oleh cloud web app yang dideploy di Vercel.

SQLite tetap boleh digunakan secara lokal pada Storva Agent untuk:

```text
cache
local queue
upload state
offline queue
```

---

# 41. SOURCE OF TRUTH

Pisahkan:

### Cloud database

Source of truth untuk:

```text
account
permissions
device
metadata
sharing
activity
sessions
```

### Filesystem

Source of truth untuk:

```text
actual binary file
actual folder
actual size
actual disk
```

---

# 42. RECONCILIATION

Agent harus memiliki fitur:

```text
Filesystem Reconciliation
```

Karena file dapat berubah dari:

```text
Windows Explorer
```

bukan hanya dari Storva.

Contoh:

User membuat:

```text
D:\Storva\Photos\new.jpg
```

melalui Windows Explorer.

Storva harus dapat mendeteksi perubahan.

Buat mekanisme:

```text
filesystem watcher
```

misalnya menggunakan:

```text
chokidar
```

dan periodic scan sebagai fallback.

---

# 43. FILESYSTEM WATCHER

Monitor:

```text
add
change
unlink
addDir
unlinkDir
```

Kemudian update metadata cloud.

Gunakan queue/debounce agar 10.000 perubahan sekaligus tidak membuat ribuan request simultan.

---

# 44. OFFLINE MODE

Jika internet rumah mati:

```text
Storva Agent
```

tetap dapat menjalankan filesystem lokal.

Web local LAN tetap dapat bekerja.

Cloud synchronization dapat dilakukan kembali ketika internet aktif.

---

# 45. AGENT SHOULD SURVIVE INTERNET FAILURE

Sangat penting:

```text
Internet OFF
```

tidak boleh berarti:

```text
Storva filesystem OFF
```

Local mode harus tetap tersedia.

---

# 46. QUEUE SYSTEM

Ketika cloud tidak tersedia:

```text
Local filesystem change
       ↓
Local queue
       ↓
Internet restored
       ↓
Synchronize metadata
```

---

# 47. TRASH

Delete:

```text
User
 ↓
Soft delete
 ↓
.trash
```

Database:

```text
is_deleted=true
deleted_at
```

Restore harus mengembalikan relative path.

---

# 48. BACKUP

Storva harus memberikan warning:

> Storage is not backup.

Buat arsitektur untuk nantinya mendukung:

```text
Backup Disk
External HDD
Second NAS
Cloud Backup
```

---

# 49. HEALTH MONITORING

Dashboard harus menampilkan:

```text
Storva Agent
● Online

Storage
● Healthy

Cloud
● Connected

Remote Access
● Connected

Last Sync
2 seconds ago
```

Jika ada masalah:

```text
Storage unavailable
Cloud unavailable
Agent offline
Remote tunnel offline
Disk almost full
```

---

# 50. DISK SPACE MONITORING

Threshold:

```text
70%  Normal
85%  Warning
95%  Critical
```

Contoh:

```text
Storage
██████████████████░░

472 GB / 500 GB

94.4%

⚠ Storage almost full
```

---

# 51. REMOTE SECURITY

Jangan pernah:

```text
Expose D:\Storva directory directly
Expose SMB publicly
Expose Windows file sharing publicly
Expose RDP publicly
Expose arbitrary filesystem API
```

Remote hanya boleh melalui Storva Agent.

---

# 52. RATE LIMITING

Rate limit:

```text
login
pairing
token generation
upload session
share generation
delete
rename
```

---

# 53. SHARE LINKS

Buat:

```text
/share/[token]
```

Share token:

- random
- hashed
- expirable
- optionally password-protected
- read-only by default

Jangan menjadikan share link sebagai direct filesystem path.

---

# 54. FILE PREVIEW

Preview harus tetap menggunakan remote transfer.

Untuk:

```text
jpg
png
webp
pdf
mp4
webm
mp3
```

gunakan:

```text
Range request
stream
signed session
```

Jangan download file penuh hanya untuk preview video.

---

# 55. REMOTE VIDEO STREAMING

Harus mendukung:

```text
HTTP Range
```

Flow:

```text
Browser Video Player
        ↓
Range Request
        ↓
Storva Agent
        ↓
File Stream
```

User harus dapat:

```text
Play
Pause
Seek
Resume
```

---

# 56. SECURITY HEADERS

Web app harus menggunakan:

```text
CSP
HSTS
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

Jangan menggunakan wildcard CORS:

```text
Access-Control-Allow-Origin: *
```

Gunakan allowlist.

---

# 57. CORS

Buat konfigurasi:

```text
WEB_ORIGIN=https://storva.example.com
```

Hanya origin resmi yang diperbolehkan.

Untuk local:

```text
http://localhost:3000
http://192.168.1.x
```

diperbolehkan melalui development/configuration mode.

---

# 58. SECRET MANAGEMENT

Secret:

```text
DATABASE_URL
SESSION_SECRET
SIGNING_PRIVATE_KEY
CLOUDFLARE_TOKEN
```

tidak boleh masuk GitHub.

Gunakan:

```text
.env.local
```

dan Vercel Environment Variables.

Agent secrets disimpan lokal dan tidak commit ke repository.

---

# 59. GITHUB SECURITY

Tambahkan:

```text
.gitignore
.env
.env.local
*.pem
*.key
*.secret
```

Buat:

```text
.env.example
```

tanpa secret.

---

# 60. CI/CD

GitHub:

```text
main
 ↓
Vercel
 ↓
Production
```

Pull Request:

```text
feature branch
 ↓
CI
 ↓
tests
 ↓
preview deployment
```

Agent tidak dideploy ke Vercel.

Agent didistribusikan sebagai:

```text
Windows installer
```

atau:

```text
portable executable
```

---

# 61. STORVA AGENT WINDOWS

Target awal:

```text
Windows 10
Windows 11
```

Agent dapat dijalankan sebagai Windows Service.

Saat Windows boot:

```text
Windows Start
     ↓
Storva Agent
     ↓
Cloudflare Tunnel
     ↓
Storva Online
```

---

# 62. AUTO START

User tidak perlu membuka command prompt.

Storva Agent harus:

```text
start automatically
restart automatically
log errors
recover after crash
```

Gunakan service mechanism yang reliable.

---

# 63. AGENT VERSIONING

Dashboard:

```text
Storva Agent

Version:
1.0.4

Status:
Up to date
```

Rencanakan:

```text
automatic update
manual update
```

untuk future release.

---

# 64. ARCHITECTURE MUST SUPPORT MULTIPLE HOME DEVICES

Walaupun saat ini hanya ada satu PC, desain harus memungkinkan:

```text
My Home PC
My Laptop NAS
My Server
```

Contoh:

```text
Devices

● Home PC
○ Office PC
○ Backup Server
```

---

# 65. DEVICE-BASED STORAGE

Database:

```text
device_id
```

Sehingga nantinya:

```text
Storva
├── Home PC
│   └── D:\Storva
│
├── Server
│   └── /storage
│
└── Backup PC
    └── E:\Backup
```

---

# 66. DASHBOARD

Dashboard harus menampilkan:

```text
Hi, Ulin 👋

Welcome back to Storva.
Your Personal Storage.
```

Storage:

```text
500 GB
472 GB Used
28 GB Free
```

Recent Files:

```text
Project.psd
Vacation.mp4
Invoice.pdf
Photo.jpg
```

Folders:

```text
Documents
Images
Videos
Projects
Backup
```

Storage chart:

```text
Documents
Images
Videos
Others
```

---

# 67. CONNECTION STATUS CARD

Tambahkan card:

```text
Storva System

Agent        ● Online
Storage      ● Healthy
Cloud        ● Connected
Remote       ● Connected
```

Klik card untuk membuka:

```text
Settings → Connection
```

---

# 68. SIDEBAR

Gunakan desain referensi yang saya kirim sebelumnya sebagai inspirasi.

Sidebar:

```text
STORVA
Your Personal Storage

Dashboard
My Files
Recent
Favorites
Shared
Trash

Categories

Documents
Images
Videos
Audio
Archives

System

Storage
Activity
Devices
Settings
```

---

# 69. VISUAL STYLE

Pertahankan style:

```text
modern
clean
minimal
premium
rounded
soft shadow
SaaS dashboard
```

Warna utama:

```text
indigo / violet / blue
```

Background:

```text
very light gray
```

Card:

```text
white
rounded
subtle shadow
```

Dark mode tetap disediakan.

---

# 70. RESPONSIVE

Mobile harus mendapatkan pengalaman penuh.

Mobile:

```text
My Files
Upload
Download
Preview
Rename
Move
Delete
Share
```

harus tetap dapat dilakukan.

---

# 71. MOBILE CONNECTION EXPERIENCE

Saat user membuka Storva:

```text
https://storva.example.com
```

login.

Aplikasi memeriksa:

```text
Can reach local Storva?
```

Jika ya:

```text
Connected locally
```

Jika tidak:

```text
Using secure remote connection
```

---

# 72. OFFLINE UI

Jika PC rumah mati:

```text
Storva

Home storage is offline.

Last seen:
Today 08:14

You can still access account settings.
```

Jangan menampilkan UI seolah file masih tersedia.

---

# 73. ERROR HANDLING

Contoh:

```text
Storage unavailable

The Storva Agent is offline or the storage drive
cannot be reached.
```

Remote:

```text
Remote connection unavailable.

Please verify that your home PC and Storva Agent are online.
```

Disk:

```text
Not enough storage space.
```

---

# 74. OBSERVABILITY

Agent log:

```text
logs/
├── agent.log
├── filesystem.log
├── remote.log
└── error.log
```

Cloud:

```text
application logs
authentication logs
audit logs
```

Jangan pernah log:

```text
password
session cookie
private key
full authorization token
```

---

# 75. AUDIT LOG

Log:

```text
LOGIN
LOGOUT
UPLOAD
DOWNLOAD
RENAME
MOVE
COPY
DELETE
RESTORE
SHARE
PAIR_DEVICE
REMOVE_DEVICE
```

Contoh:

```text
Today 09:14

Uploaded:
Project.zip

Device:
Chrome / Android

Location:
Remote

Result:
Success
```

---

# 76. ADMIN / PERSONAL MODE

MVP hanya membutuhkan satu owner.

Role:

```text
OWNER
```

Namun schema harus siap untuk:

```text
ADMIN
USER
VIEWER
```

di masa depan.

---

# 77. PERFORMANCE

Prioritas:

```text
large folder
large files
high latency internet
weak WiFi
mobile network
```

Gunakan:

```text
pagination
virtualized list
lazy loading
streaming
chunking
caching
thumbnail cache
debounce
```

---

# 78. FILE LIST API

API:

```text
GET /api/files?parent_id=...
```

Response:

```json
{
  "items": [],
  "total": 120,
  "page": 1,
  "pageSize": 50
}
```

Jangan mengirim 10.000 file dalam satu response.

---

# 79. STORAGE API

```text
GET /api/storage/status
```

Response:

```json
{
  "totalBytes": 500000000000,
  "usedBytes": 472000000000,
  "freeBytes": 28000000000,
  "percentUsed": 94.4
}
```

Data harus berasal dari filesystem aktual.

---

# 80. FILE OPERATION API

Gunakan resource IDs.

Contoh:

```text
GET    /api/files/:id
POST   /api/files/:id/download-session
POST   /api/files/:id/rename
POST   /api/files/:id/move
POST   /api/files/:id/copy
POST   /api/files/:id/delete
POST   /api/files/:id/favorite
```

Jangan:

```text
/download?path=C:\anything
```

---

# 81. AGENT API

Agent internal dapat memiliki endpoint:

```text
POST /agent/validate-session
GET  /agent/storage
GET  /agent/files
POST /agent/upload
GET  /agent/download/:session
POST /agent/move
POST /agent/copy
POST /agent/delete
```

Namun endpoint agent tidak boleh menjadi public arbitrary filesystem API.

---

# 82. PROTOCOL ABSTRACTION

Buat abstraction:

```text
StorageTransport
```

Implementasi:

```text
LocalTransport
RemoteTransport
```

Sehingga frontend tidak perlu mengetahui detail koneksi.

Contoh:

```text
storage.list()
storage.upload()
storage.download()
storage.delete()
```

Backend transport memilih:

```text
LOCAL
REMOTE
```

---

# 83. FUTURE TRANSPORT

Arsitektur harus memungkinkan:

```text
Cloudflare Tunnel
Tailscale
VPN
WebSocket
WebRTC
Direct LAN
```

ditambahkan tanpa mengubah business logic file manager.

---

# 84. FAILOVER

Jika:

```text
Local transport gagal
```

dan remote tersedia:

```text
gunakan remote
```

Jika:

```text
Remote gagal
```

tetapi local tersedia:

```text
gunakan local
```

---

# 85. SECURITY PRINCIPLE

Gunakan prinsip:

**Zero Trust**

Jangan menganggap:

```text
LAN = trusted
```

Bahkan jaringan rumah harus tetap membutuhkan authentication.

---

# 86. ZERO TRUST FILE ACCESS

Setiap operasi:

```text
Who?
Device?
Session?
Permission?
File?
Operation?
Expiration?
```

harus divalidasi.

---

# 87. REMOTE CONNECTION REVOKE

User dapat membuka:

```text
Settings
→ Devices
```

dan:

```text
Revoke Device
```

Contoh:

```text
Home PC
● Online

[Revoke]
```

Setelah revoke:

```text
Agent
→ Cloud
→ Access denied
```

---

# 88. EMERGENCY LOCK

Tambahkan:

```text
Lock Storva
```

yang memblokir seluruh remote operation.

Contoh:

```text
Remote Access

[ ON ]

Emergency Lock

[ LOCK ]
```

Jika aktif:

```text
All remote sessions revoked
```

Local LAN tetap dapat dipilih untuk tetap aktif atau ikut diblokir.

---

# 89. CLOUDFLARE TUNNEL CONFIGURATION

Jangan menulis konfigurasi Cloudflare langsung ke kode aplikasi.

Gunakan deployment/configuration documentation.

Concept:

```text
Public hostname
        ↓
Cloudflare Tunnel
        ↓
localhost:3080
```

Cloudflare Tunnel harus menjadi transport layer, bukan bagian business logic.

---

# 90. TAILSCALE CONFIGURATION

Tailscale juga hanya transport layer.

Private mode:

```text
tailscale serve
```

Public mode:

```text
tailscale funnel
```

Tailscale sendiri membedakan Serve untuk akses dalam tailnet dan Funnel untuk akses internet publik.

Untuk personal NAS, default rekomendasi:

```text
Tailscale = private mode
Cloudflare Tunnel = browser/remote public mode
```

---

# 91. SECURITY RECOMMENDATION

Jangan menggunakan:

```text
Tailscale Funnel
```

sebagai satu-satunya security layer.

Storva authentication tetap wajib.

Jangan menganggap URL tunnel sebagai password.

---

# 92. DEPLOYMENT ARCHITECTURE

GitHub:

```text
GitHub Repository
       │
       ├── apps/web
       │
       └── apps/agent
```

Vercel:

```text
apps/web
     ↓
Vercel
     ↓
Storva Web
```

Home PC:

```text
apps/agent
     ↓
Build
     ↓
Storva Agent
     ↓
Windows Service
```

---

# 93. PRODUCTION ENVIRONMENT

Web:

```text
Vercel Production
```

Database:

```text
PostgreSQL
```

Home:

```text
Windows PC
Storva Agent
Cloudflare Tunnel
D:\Storva
```

---

# 94. ENVIRONMENT VARIABLES

Vercel:

```env
DATABASE_URL=
AUTH_SECRET=
STORVA_PUBLIC_URL=
AGENT_SIGNING_PUBLIC_KEY=
CORS_ALLOWED_ORIGINS=
```

Agent:

```env
STORVA_STORAGE_PATH=D:\Storva
STORVA_CLOUD_URL=https://api.storva.example.com
STORVA_DEVICE_ID=
STORVA_DEVICE_PRIVATE_KEY=
```

Jangan pernah menyimpan private key agent pada Vercel.

---

# 95. VERCEL-SPECIFIC RULE

Jangan membuat backend Vercel sebagai permanent filesystem server.

Jangan mengasumsikan process Vercel selalu hidup.

Jangan menggunakan local filesystem Vercel sebagai NAS.

Vercel Functions memiliki lifecycle managed/serverless dan filesystem runtime bersifat read-only selain scratch `/tmp`; karena itu data NAS harus tetap berada di Home PC.

---

# 96. WEBSOCKET

WebSocket boleh digunakan untuk:

```text
realtime notifications
agent status
upload progress
activity
```

Vercel sekarang mendukung WebSocket pada Functions, tetapi koneksi dan state tetap harus dirancang sebagai stateless/distributed system dan tidak boleh dijadikan alasan untuk menyimpan filesystem NAS di Vercel.

Untuk durable state gunakan database/Redis jika diperlukan.

---

# 97. REALTIME EVENTS

Event:

```text
agent.online
agent.offline
file.uploaded
file.deleted
file.changed
storage.warning
storage.critical
```

UI dapat menerima event secara realtime.

---

# 98. TESTING — LOCAL

Harus dapat diuji:

```text
PC
 └── Storva Agent

Browser
 └── http://localhost
```

Test:

```text
upload
download
rename
delete
move
copy
preview
search
```

---

# 99. TESTING — LAN

```text
PC server
192.168.1.100

HP
192.168.1.101
```

HP harus bisa mengakses Storva.

---

# 100. TESTING — REMOTE

Simulasikan:

```text
HP menggunakan mobile data
```

kemudian:

```text
https://storva.example.com
```

Test:

```text
login
list files
upload
download
preview
delete
resume upload
resume download
```

---

# 101. NETWORK FAILURE TEST

Matikan internet PC sementara.

Pastikan:

```text
LAN access masih bekerja
```

Setelah internet kembali:

```text
cloud reconnect
heartbeat
metadata sync
remote access recover
```

---

# 102. DISK FAILURE TEST

Cabut/nonaktifkan storage drive sementara.

UI harus menunjukkan:

```text
Storage Offline
```

dan tidak crash.

---

# 103. LARGE FILE TEST

Test:

```text
100 MB
500 MB
1 GB
5 GB
10 GB
```

Periksa:

```text
RAM usage
CPU
upload resume
download resume
checksum
corruption
```

---

# 104. SECURITY TEST

Test:

```text
path traversal
expired token
revoked token
invalid token
replay attack
unauthorized file ID
unauthorized device
CORS
rate limit
```

---

# 105. IMPORTANT SECURITY TEST

Coba request:

```text
../../Windows/System32
```

atau:

```text
C:\Windows\System32
```

atau:

```text
\\server\share
```

Semuanya harus:

```text
BLOCKED
```

---

# 106. PERFORMANCE TARGET

Target MVP:

```text
File browsing < 500ms local
Dashboard < 1s local
Search responsive
Upload progress real-time
Large files streamed
```

Remote performance bergantung pada:

```text
home upload bandwidth
client download bandwidth
latency
disk speed
CPU
```

---

# 107. UI CONNECTION INDICATOR

Global topbar harus memiliki status:

```text
● Local
```

atau:

```text
● Remote
```

atau:

```text
● Offline
```

Klik status:

```text
Connection Details
```

---

# 108. USER EXPERIENCE

User tidak perlu memahami:

```text
Cloudflare
Tailscale
Tunnel
Agent
Token
```

Semua detail teknis berada di:

```text
Settings → Advanced
```

Pengalaman normal user:

```text
Login
 ↓
Open My Files
 ↓
Files work
```

---

# 109. ADVANCED SETTINGS

Tampilkan:

```text
Agent
Connection
Storage Root
Remote Access
Cloudflare
Tailscale
Network
Logs
Diagnostics
```

---

# 110. DIAGNOSTIC TOOL

Tambahkan:

```text
Settings
→ Diagnostics
```

Tombol:

```text
[ Run Diagnostics ]
```

Hasil:

```text
Cloud Connection    ✓
Agent               ✓
Storage             ✓
Database            ✓
Remote Tunnel       ✓
Filesystem Access   ✓
```

---

# 111. ONE-CLICK COPY DIAGNOSTIC

Buat:

```text
Copy Diagnostic Report
```

Tetapi pastikan report tidak mengandung:

```text
password
token
private key
session
```

---

# 112. BACKGROUND SERVICE RECOVERY

Jika Storva Agent crash:

```text
Windows
 ↓
Service Manager
 ↓
Restart Storva Agent
```

Jika Cloudflare Tunnel crash:

```text
Service Manager
 ↓
Restart
```

---

# 113. UPS / POWER FAILURE

Arsitektur harus mengantisipasi PC restart.

Setelah boot:

```text
Windows
 ↓
Storva Agent
 ↓
Storage validation
 ↓
Cloud reconnect
 ↓
Tunnel reconnect
 ↓
Heartbeat
 ↓
Online
```

---

# 114. DATA CONSISTENCY

Jangan menganggap metadata database selalu benar.

Jika:

```text
Database says file exists
Filesystem says file missing
```

UI harus menunjukkan status yang sesuai.

Buat reconciliation.

---

# 115. DELETION SAFETY

Delete permanent harus meminta confirmation.

Untuk file besar:

```text
Are you sure?
```

Tampilkan:

```text
Name
Size
Location
```

---

# 116. ACTIVITY LOCATION

Log apakah operasi dilakukan:

```text
Local
Remote
```

Contoh:

```text
Uploaded project.zip
Remote
```

atau:

```text
Renamed photo.jpg
Local
```

---

# 117. IP INFORMATION

Dashboard diagnostics boleh menampilkan:

```text
Local IP:
192.168.1.100

Remote Access:
Connected

Agent:
Online
```

Jangan tampilkan public IP secara default.

---

# 118. DOCUMENTATION

README harus memiliki:

```text
What is Storva
Architecture
Requirements
Installation
Local Development
Windows Agent
Database Setup
Vercel Deployment
Cloudflare Tunnel
Tailscale
Environment Variables
Production Setup
Security
Troubleshooting
Backup
Upgrade
```

---

# 119. DEPLOYMENT GUIDE

Dokumentasi deployment harus memisahkan:

## CLOUD

```text
GitHub
 ↓
Vercel
 ↓
PostgreSQL
```

## HOME

```text
Windows PC
 ↓
Storva Agent
 ↓
D:\Storva
 ↓
Cloudflare Tunnel
```

---

# 120. FINAL ARCHITECTURE

Hasil akhir yang saya inginkan:

```text
                              INTERNET
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
                STORVA WEB                 CLOUDFLARE
                VERCEL                     TUNNEL
                     │                         │
                     │                         │
                     │                ┌────────▼────────┐
                     │                │   HOME ROUTER   │
                     │                │ No Port Forward │
                     │                └────────┬────────┘
                     │                         │
                     │                  HOME WINDOWS PC
                     │                         │
                     │                ┌────────▼────────┐
                     │                │  STORVA AGENT   │
                     │                └────────┬────────┘
                     │                         │
                     │                ┌────────▼────────┐
                     │                │   FILESYSTEM    │
                     │                │                  │
                     │                │    D:\Storva    │
                     │                └──────────────────┘
                     │
                     ▼
              PostgreSQL
           Metadata / Auth
```

---

# 121. THE MOST IMPORTANT ARCHITECTURAL RULES

Ikuti aturan berikut tanpa pengecualian:

```text
1. Vercel ≠ NAS Storage
2. Home PC = source of binary data
3. Storva Agent = filesystem gateway
4. Browser tidak pernah mendapatkan arbitrary filesystem path
5. Semua file access menggunakan file_id / relative_path
6. Remote access tidak menggunakan public port router
7. Cloudflare/Tailscale hanya transport layer
8. Authentication tetap dilakukan oleh Storva
9. File besar harus streaming/chunked
10. Database tidak menyimpan binary file
11. Filesystem harus sandboxed
12. Local mode harus tetap bekerja ketika internet mati
13. Remote mode harus bekerja ketika user berada di luar rumah
14. Agent harus berjalan sebagai service
15. Agent harus auto-recover
16. Semua secret tidak boleh masuk GitHub
17. Semua operasi sensitif harus diaudit
18. Reconciliation filesystem wajib tersedia
19. Backup harus dipisahkan dari NAS
20. Arsitektur harus dapat berkembang menjadi multi-device
```

---

# 122. DEVELOPMENT ORDER

Kerjakan secara bertahap.

## PHASE 1

Build:

```text
Monorepo
Next.js
TypeScript
Tailwind
Database
Authentication
```

## PHASE 2

Build:

```text
Storva Agent
Filesystem service
Safe path
File CRUD
Folder CRUD
```

## PHASE 3

Build:

```text
Upload
Download
Streaming
Range request
Thumbnail
Preview
```

## PHASE 4

Build:

```text
Dashboard
Storage statistics
Search
Favorite
Trash
Activity
```

## PHASE 5

Build:

```text
Device registration
Agent heartbeat
Pairing
Cloud control plane
```

## PHASE 6

Build:

```text
Cloudflare Tunnel
Remote access
Signed connection session
```

## PHASE 7

Build:

```text
Tailscale private mode
Connection manager
Auto-detection
```

## PHASE 8

Build:

```text
Reconciliation
Offline queue
Recovery
Diagnostics
```

## PHASE 9

Security hardening.

## PHASE 10

Production deployment.

---

# 123. FINAL USER EXPERIENCE

Saya ingin user experience seperti ini:

## DI RUMAH

Buka:

```text
https://storva.example.com
```

Login.

Storva mendeteksi:

```text
Local connection
```

Kemudian file ditransfer melalui jaringan lokal.

---

## DI LUAR RUMAH

Buka:

```text
https://storva.example.com
```

Login.

Storva mendeteksi:

```text
Remote connection
```

Kemudian koneksi diarahkan melalui secure remote transport menuju:

```text
Storva Agent
```

yang berada di PC rumah.

User tidak perlu memikirkan:

```text
IP rumah
Port
NAT
Port forwarding
Dynamic DNS
```

---

# 124. END RESULT

Storva harus terasa seperti:

**Google Drive pribadi + Dropbox + NAS + Private Cloud**

tetapi:

```text
DATA:
tetap di rumah saya

WEB UI:
Vercel

DATABASE:
Cloud PostgreSQL

FILES:
PC rumah

REMOTE ACCESS:
Cloudflare Tunnel

PRIVATE NETWORK:
Optional Tailscale

AGENT:
Storva Agent
```

Jangan membuat solusi yang hanya berhasil pada localhost.

Target akhir harus benar-benar production-ready untuk penggunaan pribadi:

```text
LOCAL
+
REMOTE
+
SECURE
+
SELF-HOSTED STORAGE
+
VERCEL DEPLOYMENT
```

Dan seluruh arsitektur harus tetap memungkinkan pengembangan fitur selanjutnya seperti:

```text
Desktop Sync
Mobile App
Automatic Backup
Multi-user
WebDAV
Photo Gallery
Video Streaming
Public Sharing
Multiple Storage Devices
Encryption
Version History
```

Tanpa harus mengubah fundamental architecture.