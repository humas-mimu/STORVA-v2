# MASTER PROMPT — PERSONAL NAS WEB APP

Saya ingin membangun sebuah **Personal NAS (Network Attached Storage) berbasis Web App** yang berjalan di komputer/PC rumah saya.

Tujuan utama aplikasi ini adalah mengubah PC rumah menjadi **private cloud storage pribadi** yang dapat digunakan melalui browser dari PC, laptop, tablet, maupun smartphone yang berada dalam jaringan lokal.

Jangan membuat aplikasi sekadar sebagai mockup UI. Buat aplikasi yang benar-benar terhubung dengan filesystem komputer dan dapat melakukan operasi file secara nyata.

---

## 1. KONSEP UTAMA

Nama sementara aplikasi:

**HomeNAS**

Aplikasi harus bekerja seperti kombinasi:

- Google Drive
- Dropbox
- File Manager
- Personal Cloud
- NAS Dashboard

Namun seluruh file disimpan secara lokal di hard disk PC rumah.

Contoh:

```text
PC RUMAH
│
├── Storage Disk
│   └── HomeNAS
│       ├── Documents
│       ├── Images
│       ├── Videos
│       ├── Music
│       ├── Archives
│       └── Others
│
├── Web Application
│
└── Database
    ├── users
    ├── files
    ├── folders
    ├── sessions
    └── activity_logs
```

Browser client:

```text
PC / Laptop / HP
       │
       │ HTTP / HTTPS
       ▼
   HomeNAS Web
       │
       ▼
 Backend Server
       │
       ├── Database
       │
       └── Local Filesystem
```

Aplikasi harus dapat dijalankan pada PC rumah dan diakses menggunakan IP lokal seperti:

```text
http://192.168.1.100:3000
```

Gunakan konfigurasi environment sehingga storage directory dapat diganti tanpa mengubah source code.

Contoh:

```env
NAS_STORAGE_PATH=D:\HomeNAS
PORT=3000
HOST=0.0.0.0
DATABASE_URL=./data/homenas.db
```

Untuk Linux/macOS juga sediakan dukungan:

```env
NAS_STORAGE_PATH=/home/user/HomeNAS
```

---

# 2. PRIORITAS UTAMA

Prioritaskan:

1. Stabilitas filesystem
2. Keamanan
3. File operation yang benar
4. Performance
5. Responsive UI
6. User experience
7. Tampilan modern

Jangan mengorbankan keamanan filesystem hanya demi tampilan.

---

# 3. TECH STACK

Gunakan stack modern dan mudah dikembangkan.

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- React Router
- TanStack Query
- Recharts atau library chart ringan

Backend:

- Node.js
- TypeScript
- Express atau Fastify
- REST API
- WebSocket jika diperlukan untuk realtime activity

Database:

- SQLite
- Prisma ORM

Authentication:

- Session-based authentication atau secure JWT
- Password hashing menggunakan Argon2 atau bcrypt
- HttpOnly cookie
- CSRF protection bila menggunakan cookie authentication

Filesystem:

Gunakan Node.js native filesystem API:

```text
fs/promises
stream
path
```

Jangan menyimpan file binary ke database.

Database hanya menyimpan metadata file.

---

# 4. STRUKTUR PROJECT

Gunakan struktur modular seperti:

```text
homenas/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── filesystem/
│   │   ├── database/
│   │   ├── auth/
│   │   └── utils/
│
├── data/
├── uploads/
├── thumbnails/
├── logs/
├── .env
└── README.md
```

Buat pemisahan frontend dan backend dengan jelas.

---

# 5. UI / DESIGN

Gunakan gambar referensi yang saya berikan sebagai **inspirasi visual utama**.

Jangan menyalin desain secara identik.

Ambil karakter desain:

- modern
- clean
- rounded corners
- soft shadow
- dashboard SaaS
- sidebar kiri
- content area luas
- card-based UI
- banyak whitespace
- icon-based navigation
- warna dominan putih
- aksen indigo/blue/purple
- sedikit gradient
- typography modern
- responsive

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar │                  Main Content                      │
│         │                                                    │
│ Logo    │ Header                                             │
│         │                                                    │
│ Home    │ Storage Overview                                   │
│ Files   │                                                    │
│ Shared  │ Recent Files        Folders                        │
│ Starred │                                                    │
│ Trash   │                                                    │
│         │                                                    │
│─────────│                                                    │
│ Storage │                                                    │
│ 45 GB   │                                                    │
│         │                                                    │
│ Profile │                                                    │
└──────────────────────────────────────────────────────────────┘
```

Pada mobile:

- Sidebar berubah menjadi drawer
- Bottom navigation boleh digunakan
- File list berubah menjadi card/list responsive
- Semua fungsi harus tetap dapat digunakan

---

# 6. SIDEBAR

Sidebar berisi:

```text
HOME

Dashboard
My Files
Recent
Shared
Favorites
Trash

ORGANIZATION

Documents
Images
Videos
Music
Archives

SYSTEM

Storage
Activity
Settings
```

Bagian paling bawah:

```text
User Avatar
Username
Online
```

---

# 7. DASHBOARD

Dashboard harus menjadi halaman utama setelah login.

Header:

```text
Hi, [Username]
Welcome back to your personal cloud.
```

Tambahkan tombol:

```text
Upload
New Folder
```

---

# 8. STORAGE OVERVIEW

Tampilkan card penyimpanan.

Contoh:

```text
Storage

128 GB Used
500 GB Total

██████████████░░░░░░ 25.6%

Documents    20 GB
Images       35 GB
Videos       50 GB
Others       23 GB
```

Hitung kapasitas berdasarkan filesystem sebenarnya.

Gunakan:

- total disk
- free disk
- used disk

Jangan menggunakan angka dummy.

Jika memungkinkan gunakan filesystem statistics Node.js.

Untuk Windows gunakan informasi drive yang sebenarnya.

---

# 9. CATEGORY STORAGE

Tampilkan statistik berdasarkan kategori file:

```text
Documents
Images
Videos
Audio
Archives
Others
```

Kategori ditentukan dari MIME type dan extension.

Contoh:

```text
PDF
DOC
DOCX
XLS
XLSX
PPT
TXT
```

masuk Documents.

---

# 10. MY FILES

Halaman utama file manager.

Contoh:

```text
My Files

Home / Documents / Projects

[ Search files... ]   [Sort] [Filter] [Grid/List]

────────────────────────────────────────────

Name           Size       Modified       Type
Project.pdf    12 MB      Today          PDF
Photo.jpg      4 MB       Yesterday      Image
Backup.zip     2 GB       Monday         Archive
```

Fitur:

- Grid view
- List view
- Search
- Sort
- Filter
- Multi-select
- Select all
- Rename
- Delete
- Move
- Copy
- Download
- Favorite
- Share
- Create folder

---

# 11. FILE UPLOAD

Upload harus benar-benar menyimpan file ke storage.

Support:

- drag & drop
- multiple files
- folder upload bila browser mendukung
- progress indicator
- cancel upload
- retry upload
- duplicate filename handling

Contoh upload:

```text
Uploading...

Project.zip
██████████████░░░░ 72%
1.4 GB / 2 GB

[Cancel]
```

Jangan memuat seluruh file besar ke memory.

Gunakan streaming/multipart upload.

---

# 12. LARGE FILE SUPPORT

Aplikasi harus dirancang agar file besar tetap dapat diproses.

Jangan melakukan:

```text
read entire file → RAM → save
```

Gunakan stream.

Untuk file besar, gunakan:

- streaming upload
- streaming download
- HTTP Range Requests
- resumable/chunk upload bila memungkinkan

Tujuannya supaya file:

```text
500 MB
1 GB
5 GB
10 GB
```

tidak menyebabkan aplikasi crash karena RAM penuh.

---

# 13. DOWNLOAD

Download harus dilakukan melalui filesystem stream.

Jangan membaca seluruh file ke memory.

Gunakan:

```text
createReadStream()
```

Tambahkan dukungan:

```text
Content-Length
Content-Type
Content-Disposition
Range
```

---

# 14. FILE PREVIEW

File yang didukung preview:

Images:

```text
jpg
jpeg
png
webp
gif
svg
```

Documents:

```text
pdf
txt
```

Video:

```text
mp4
webm
mov
mkv
```

Audio:

```text
mp3
wav
ogg
```

Office files dapat menampilkan metadata atau preview jika memungkinkan.

Untuk file unsupported:

```text
Preview unavailable
[Download File]
```

Video harus dapat menggunakan HTTP Range sehingga dapat melakukan seek.

---

# 15. FOLDER MANAGEMENT

Pengguna dapat:

```text
Create Folder
Rename Folder
Delete Folder
Move Folder
Copy Folder
```

Folder harus benar-benar dibuat di filesystem.

Contoh:

```text
D:\HomeNAS\Documents\Projects
```

Database menyimpan metadata yang diperlukan.

---

# 16. DATABASE DESIGN

Buat schema minimal:

### users

```text
id
username
email
password_hash
avatar
created_at
updated_at
```

### files

```text
id
name
original_name
path
parent_id
size
mime_type
extension
is_folder
is_favorite
is_deleted
created_at
updated_at
deleted_at
```

### activities

```text
id
user_id
action
file_id
metadata
created_at
```

### sessions

```text
id
user_id
token_hash
expires_at
created_at
```

Jangan menyimpan binary file dalam SQLite.

---

# 17. FILESYSTEM SECURITY

Ini sangat penting.

Jangan pernah langsung menerima path dari user lalu melakukan:

```text
fs.readFile(userPath)
```

Harus ada path sanitization dan path validation.

Lindungi aplikasi dari:

```text
../
../../
..
absolute path
symbolic path abuse
path traversal
```

Semua file operation harus dibatasi pada:

```text
NAS_STORAGE_PATH
```

Contoh:

```text
D:\HomeNAS
```

User tidak boleh dapat mengakses:

```text
D:\Windows
D:\Users
C:\Program Files
C:\
```

kecuali memang secara eksplisit dikonfigurasi sebagai storage.

Gunakan fungsi utility khusus:

```text
resolveSafePath()
```

yang memastikan hasil path tetap berada di dalam root storage.

---

# 18. TRASH / RECYCLE BIN

Jangan langsung menghapus file saat user menekan Delete.

Pindahkan ke:

```text
.trash/
```

atau mekanisme trash internal.

UI:

```text
Trash

Project.pdf
Deleted 2 days ago

[Restore]
[Delete Permanently]
```

Support:

- restore
- permanent delete
- empty trash

---

# 19. FAVORITES

User dapat menandai file/folder sebagai favorite.

Contoh:

```text
⭐ Important Project
⭐ Family Photos
⭐ Documents
```

---

# 20. RECENT FILES

Dashboard menampilkan file terakhir digunakan.

Contoh:

```text
Recent Files

📄 Project.pdf
🖼 Photo.jpg
🎬 Video.mp4
📦 Backup.zip
```

Data berasal dari activity atau updated_at sebenarnya.

---

# 21. ACTIVITY LOG

Tampilkan aktivitas:

```text
Today

Uploaded:
Project.pdf

Downloaded:
Backup.zip

Created folder:
Projects

Deleted:
Old File.zip
```

Activity harus direkam ketika:

- upload
- download
- rename
- move
- copy
- delete
- restore
- create folder
- login

---

# 22. SEARCH

Search harus benar-benar mencari file dari database dan/atau filesystem metadata.

Support:

```text
filename
extension
type
folder
date
size
```

Contoh:

```text
Search: project

Project.pdf
Project.zip
Project-final.psd
Project Assets
```

Debounce search input.

Untuk storage besar, gunakan database indexing.

---

# 23. SHARING

Karena aplikasi digunakan pribadi, fitur sharing tidak perlu terlalu kompleks pada versi pertama.

Tetapi desain backend harus memungkinkan fitur:

```text
Generate Share Link
```

Contoh:

```text
http://192.168.1.100:3000/share/abc123
```

Share link dapat memiliki:

```text
expiration
password
download permission
```

Pastikan share token acak dan tidak mudah ditebak.

---

# 24. AUTHENTICATION

Saat membuka aplikasi:

```text
Login

Username
Password

[Login]
```

Support:

- logout
- change password
- session expiration
- protected routes

Semua API selain endpoint public tertentu harus membutuhkan authentication.

Password jangan pernah disimpan plaintext.

---

# 25. FIRST RUN SETUP

Saat aplikasi pertama kali dijalankan:

```text
Welcome to HomeNAS

Create Administrator

Username:
Password:

Storage Location:

D:\HomeNAS

[Create NAS]
```

Setelah setup:

```text
NAS Ready!

Storage:
500 GB

Available:
420 GB
```

---

# 26. SETTINGS

Settings dibagi menjadi:

### General

```text
NAS Name
Timezone
Language
Theme
```

### Storage

```text
Storage Location
Storage Capacity
Used Space
Free Space
```

### Security

```text
Change Password
Session Timeout
Login Protection
```

### Network

```text
Server Port
Local IP
Host
```

### Appearance

```text
Light
Dark
System
```

---

# 27. NETWORK ACCESS

Server harus listen ke:

```text
0.0.0.0
```

agar perangkat lain dalam LAN dapat mengakses.

Contoh:

PC server:

```text
192.168.1.100
```

Browser:

```text
http://192.168.1.100:3000
```

Jelaskan dalam README bagaimana melakukan:

- mengetahui IP PC
- membuka Windows Firewall
- allow port aplikasi
- mengakses dari HP
- membuat IP menjadi static/reserved DHCP

---

# 28. LOCAL NETWORK SECURITY

Default aplikasi harus aman digunakan hanya dalam LAN.

Jangan otomatis membuka port ke internet.

Berikan warning:

```text
Your NAS is currently accessible on your local network.

Do not expose this port directly to the internet
without proper HTTPS/authentication/security configuration.
```

Untuk akses remote pada tahap selanjutnya, arsitektur harus memungkinkan penggunaan:

```text
Tailscale
Cloudflare Tunnel
VPN
Reverse Proxy
```

Tetapi jangan menjadikan port forwarding router sebagai requirement.

---

# 29. DASHBOARD VISUALIZATION

Gunakan chart storage.

Contoh:

```text
Storage Usage

Documents   ███████ 20%
Images      █████████████ 35%
Videos      ███████████████ 40%
Others      ██ 5%
```

Gunakan donut chart atau radial chart yang modern.

---

# 30. EMPTY STATES

Jangan menampilkan area kosong tanpa informasi.

Contoh:

```text
No files here

Upload your first file to get started.

[Upload File]
```

---

# 31. ERROR HANDLING

Buat error handling yang jelas.

Contoh:

```text
Upload failed

The file could not be uploaded.

[Retry]
```

Untuk filesystem:

```text
Storage unavailable

The configured storage path cannot be accessed.
Please check the storage drive.
```

Untuk disk penuh:

```text
Not enough storage space.
```

Jangan menampilkan stack trace backend ke user.

Error detail hanya dicatat di server log.

---

# 32. PERFORMANCE

Perhatikan:

- lazy loading
- pagination
- virtualized file list bila diperlukan
- database indexing
- streaming
- thumbnail caching
- debounce search
- background processing

Untuk folder berisi 10.000+ file, UI tetap harus responsif.

Jangan langsung mengirim seluruh isi folder sekaligus.

---

# 33. THUMBNAIL

Untuk gambar dan video, buat thumbnail/cache bila diperlukan.

Simpan thumbnail di:

```text
/thumbnails
```

Jangan membuat thumbnail setiap kali halaman dibuka.

Gunakan cache.

---

# 34. STORAGE ANALYTICS

Hitung:

```text
Total
Used
Free
Files
Folders
Images
Videos
Documents
Others
```

Dashboard harus menggunakan data aktual.

---

# 35. DARK MODE

Sediakan dark mode.

Light mode:

- background putih / very light gray
- card putih
- accent indigo/blue

Dark mode:

- background dark
- card slightly lighter
- text high contrast
- accent tetap konsisten

---

# 36. RESPONSIVE

Desktop:

```text
Sidebar + Main Dashboard
```

Tablet:

```text
Compact Sidebar
```

Mobile:

```text
Top Header
Content
Bottom Navigation / Drawer
```

Pastikan file upload dan download nyaman digunakan dari smartphone.

---

# 37. UI COMPONENTS

Buat reusable components:

```text
AppSidebar
Topbar
StorageCard
FileCard
FileList
FolderCard
UploadModal
CreateFolderModal
RenameModal
DeleteModal
FilePreview
SearchBar
ActivityList
StorageChart
ContextMenu
Breadcrumb
Pagination
Toast
ConfirmDialog
EmptyState
LoadingState
```

---

# 38. CONTEXT MENU FILE

Klik kanan file menampilkan:

```text
Open
Preview
Download
Rename
Copy
Move
Favorite
Share
Delete
Properties
```

Mobile gunakan tombol `...`.

---

# 39. FILE PROPERTIES

Tampilkan:

```text
Name
Type
Size
Location
Created
Modified
MIME Type
```

Contoh:

```text
Project.psd

Size:
245 MB

Location:
/Documents/Projects

Created:
12 Aug 2026

Modified:
25 Aug 2026
```

---

# 40. LOGGING

Server memiliki log.

Contoh:

```text
logs/
├── app.log
├── error.log
└── access.log
```

Jangan menyimpan password/token sensitif ke log.

---

# 41. CONFIGURATION

Semua konfigurasi penting harus berada di `.env`.

Contoh:

```env
PORT=3000
HOST=0.0.0.0

NAS_STORAGE_PATH=D:\HomeNAS

DATABASE_URL=file:./data/homenas.db

SESSION_SECRET=CHANGE_THIS

MAX_UPLOAD_SIZE=20GB

THUMBNAIL_ENABLED=true
```

Jangan hardcode storage path.

---

# 42. WINDOWS SUPPORT

Karena target penggunaan utama adalah PC rumah, berikan perhatian khusus pada Windows.

README harus menjelaskan:

```text
1. Install Node.js
2. Clone project
3. npm install
4. Configure .env
5. npm run setup
6. npm run dev
```

Untuk production:

```text
npm run build
npm start
```

Berikan panduan menjalankan server otomatis saat Windows startup.

Bisa gunakan:

- Windows Task Scheduler
- NSSM
- PM2

Pilih metode yang paling sederhana dan jelaskan langkahnya.

---

# 43. BACKUP

Jangan menganggap NAS = backup.

Tambahkan informasi pada Settings:

```text
Important:
NAS storage is not automatically a backup.

Consider backing up important files to another disk.
```

Arsitektur nantinya dapat dikembangkan menjadi:

```text
NAS Disk
   │
   ├── Primary Storage
   │
   └── Backup Disk
```

---

# 44. API DESIGN

Gunakan REST API seperti:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/files
POST   /api/files/upload
GET    /api/files/:id
GET    /api/files/:id/download
DELETE /api/files/:id
PATCH  /api/files/:id
POST   /api/files/:id/move
POST   /api/files/:id/copy

GET    /api/folders
POST   /api/folders
PATCH  /api/folders/:id
DELETE /api/folders/:id

GET    /api/storage
GET    /api/activity
GET    /api/search

POST   /api/share
DELETE /api/share/:id
```

Pisahkan controller, service, repository/database layer.

---

# 45. SECURITY CHECKLIST

Implementasikan minimal:

- Password hashing
- Authentication middleware
- HttpOnly cookies
- Rate limiting login
- Input validation
- Path traversal protection
- MIME/type validation
- File extension validation
- Maximum upload size
- Secure random share tokens
- Permission checks
- CSRF protection bila relevan
- Security headers
- CORS yang dibatasi
- Sanitized filenames
- Server-side validation

Jangan percaya validasi yang hanya dilakukan di frontend.

---

# 46. FILE NAME HANDLING

User dapat mengupload:

```text
photo.jpg
photo (1).jpg
photo-final.jpg
```

Jika nama sama, jangan menimpa file tanpa konfirmasi.

Gunakan:

```text
photo (1).jpg
photo (2).jpg
```

atau tampilkan dialog:

```text
File already exists.

Replace
Keep both
Cancel
```

---

# 47. DATABASE VS FILESYSTEM

Filesystem adalah sumber binary file.

Database menyimpan metadata.

Contoh:

Filesystem:

```text
D:\HomeNAS\Photos\vacation.jpg
```

Database:

```text
name = vacation.jpg
path = Photos/vacation.jpg
size = 5242880
mime_type = image/jpeg
parent_id = ...
```

Pastikan database tidak menjadi sumber data tunggal yang menyebabkan file tidak dapat ditemukan.

Buat service untuk melakukan sinkronisasi/reconcile bila diperlukan.

---

# 48. STORAGE HEALTH

Pada Settings > Storage tampilkan:

```text
Storage Health

Drive:
D:\

Status:
Healthy

Total:
2 TB

Used:
1.1 TB

Free:
900 GB
```

Jika drive tidak tersedia:

```text
Storage Offline
```

---

# 49. FUTURE-READY ARCHITECTURE

Buat arsitektur agar nantinya mudah menambahkan:

```text
Multi-user
Permissions
Public share links
Photo gallery
Video streaming
Music player
Office preview
Desktop sync client
Mobile application
Automatic backup
Remote access
WebDAV
SMB integration
Docker
HTTPS
Tailscale
Cloudflare Tunnel
```

Namun jangan membuat fitur tersebut sekarang kecuali diperlukan.

Fokus MVP terlebih dahulu.

---

# 50. MVP PHASE

Versi pertama WAJIB memiliki:

```text
Login
Dashboard
Storage statistics
File manager
Folder manager
Upload
Download
Rename
Delete
Trash
Move
Copy
Search
Favorites
File preview
Activity
Settings
Responsive UI
Real filesystem integration
```

Semua fungsi harus benar-benar bekerja, bukan dummy.

---

# 51. DESIGN LANGUAGE

Visual harus terasa seperti:

```text
Modern SaaS
+
Google Drive
+
Dropbox
+
Personal NAS
```

Gunakan:

- rounded-xl
- subtle shadow
- clean spacing
- modern typography
- indigo/purple accent
- soft gray background
- white cards
- polished hover state
- smooth transition
- minimal border
- clear hierarchy

Jangan terlalu banyak gradient.

Jangan membuat UI terlalu ramai.

Jangan menggunakan terlalu banyak warna.

Prioritaskan usability.

---

# 52. DASHBOARD LAYOUT

Target visual dashboard kira-kira:

```text
┌──────────────────────────────────────────────────────────┐
│ SIDEBAR         │ TOPBAR                  🔍  🔔  👤     │
│                 ├────────────────────────────────────────┤
│ HomeNAS         │                                        │
│                 │ Hi, User 👋                            │
│ Dashboard       │ Welcome to your personal cloud.        │
│ My Files        │                                        │
│ Recent          │ [ Upload ] [ + New Folder ]            │
│ Favorites       │                                        │
│ Shared          │ ┌────────┐ ┌────────┐ ┌────────┐       │
│ Trash           │ │Documents│ │ Images │ │ Videos │       │
│                 │ │ 20 GB   │ │ 35 GB  │ │ 50 GB  │       │
│                 │ └────────┘ └────────┘ └────────┘       │
│                 │                                        │
│ Storage         │ ┌──────────────────┐ ┌──────────────┐   │
│ ███████░░ 72%   │ │ Recent Files     │ │ Storage      │   │
│                 │ │                  │ │              │   │
│ Settings        │ │ file.pdf         │ │    ◯ 72%     │   │
│                 │ │ image.jpg        │ │              │   │
│                 │ │ backup.zip       │ │              │   │
│                 │ └──────────────────┘ └──────────────┘   │
│                 │                                        │
└──────────────────────────────────────────────────────────┘
```

---

# 53. IMPLEMENTATION STRATEGY

Jangan langsung membuat seluruh aplikasi sekaligus.

Kerjakan secara bertahap:

### Phase 1
Project setup.

### Phase 2
Authentication.

### Phase 3
Filesystem service.

### Phase 4
Database.

### Phase 5
File/folder CRUD.

### Phase 6
Upload/download streaming.

### Phase 7
Dashboard.

### Phase 8
Search/favorites/trash.

### Phase 9
Preview.

### Phase 10
Security hardening.

### Phase 11
Responsive/mobile.

### Phase 12
Production setup.

Setelah setiap phase selesai, lakukan test sebelum melanjutkan.

---

# 54. TESTING

Buat test untuk:

```text
Authentication
File upload
Large file upload
File download
Folder creation
Rename
Move
Copy
Delete
Restore
Search
Path traversal
Permission
Disk full
Missing storage drive
Duplicate filename
Invalid file
```

Pastikan operasi filesystem tidak corrupt.

---

# 55. IMPORTANT RULE

Jangan membuat filesystem abstraction yang memungkinkan user menentukan arbitrary path.

User hanya mengoperasikan file berdasarkan:

```text
file_id
folder_id
```

Backend yang menentukan path sebenarnya.

Contoh:

```text
POST /api/files/123/download
```

bukan:

```text
GET /download?path=C:\Windows\system32
```

---

# 56. FINAL EXPECTATION

Saya ingin hasil akhirnya berupa web app yang ketika dijalankan di PC rumah akan memberikan pengalaman seperti:

```text
Google Drive pribadi
```

tetapi seluruh data berada di:

```text
PC rumah saya sendiri
```

Contoh penggunaan:

```text
PC Server
192.168.1.100

        │
        ├── Laptop
        │
        ├── Smartphone
        │
        ├── Tablet
        │
        └── PC lain
```

Semua perangkat dapat membuka:

```text
http://192.168.1.100:3000
```

kemudian login dan mengakses storage.

---

# 57. DEVELOPMENT RULES

Saat membuat kode:

1. Gunakan TypeScript.
2. Hindari `any` kecuali benar-benar diperlukan.
3. Gunakan error handling yang konsisten.
4. Gunakan reusable components.
5. Pisahkan frontend dan backend.
6. Jangan hardcode path.
7. Jangan hardcode credentials.
8. Jangan menyimpan file binary ke database.
9. Gunakan streaming untuk file besar.
10. Validasi semua input di server.
11. Jangan mempercayai path dari client.
12. Jangan expose filesystem di luar storage root.
13. Jangan menghapus file permanen tanpa melalui trash.
14. Jangan membuat data dummy untuk fitur yang seharusnya membaca data nyata.
15. Dashboard harus menggunakan data filesystem sebenarnya.
16. Semua API harus memiliki HTTP status code yang sesuai.
17. Buat README lengkap.
18. Buat `.env.example`.
19. Berikan instruksi Windows dan Linux.
20. Prioritaskan keamanan filesystem.

---

# 58. OUTPUT YANG SAYA INGINKAN DARI AI CODING

Jangan hanya memberikan potongan kode.

Bangun project secara bertahap dan berikan:

```text
1. Project architecture
2. Database schema
3. Backend
4. Filesystem service
5. API
6. Frontend
7. UI
8. Authentication
9. Testing
10. README
11. Environment configuration
12. Production deployment instructions
```

Setiap tahap harus dapat dijalankan dan diuji sebelum lanjut.

Jika terdapat keputusan teknis yang belum ditentukan, pilih solusi yang:

```text
simple
stable
secure
maintainable
easy to run on a home PC
```

Jangan memilih teknologi hanya karena populer.

Target utama adalah:

**Personal NAS Web App yang benar-benar usable di PC rumah, bukan sekadar UI prototype.**