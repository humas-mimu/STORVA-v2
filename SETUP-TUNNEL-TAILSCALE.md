# Setup Tailscale Funnel untuk Storva Agent (Gratis, Tanpa Domain)

Tujuan: memberi `apps/agent` (jalan di PC/NAS, port `5125`) alamat HTTPS publik permanen, tanpa perlu domain/DNS/nameserver sama sekali — supaya `apps/web` di Vercel bisa menghubunginya lewat `STORVA_AGENT_URL`.

> Sintaks CLI Tailscale untuk Funnel/Serve berubah sejak versi 1.52 (`tailscale funnel <port> on` yang lama sudah tidak berlaku). Panduan ini pakai sintaks terbaru.

---

## 1. Install Tailscale

Kalau `winget install tailscale.tailscale` macet/lambat, download langsung lewat browser dari https://tailscale.com/download/windows, lalu jalankan file `.exe`-nya.

## 2. Login

```powershell
tailscale up
```
Browser terbuka, login/daftar pakai akun Google/Microsoft/GitHub (gratis, tanpa kartu kredit).

## 3. Cek nama perangkat

```powershell
tailscale status
```
Contoh hasil:
```
100.73.4.67  komputer-server  icmimu-id@  windows  -
```
`komputer-server` ini nama device kamu — jadi bagian URL publik nanti.

## 4. Aktifkan HTTPS untuk tailnet (kalau belum)

Buka https://login.tailscale.com/admin/dns → bagian **HTTPS Certificates** → klik **Enable HTTPS**.

## 5. Aktifkan fitur Funnel di akun (sekali saja, per akun)

Kalau baru pertama kali pakai Funnel, saat menjalankan perintah di Langkah 6 nanti akan muncul pesan:
```
Funnel is not enabled on your tailnet.
To enable, visit:
    https://login.tailscale.com/f/funnel?node=xxxxxxxxxx
```
Buka link itu di browser (login pakai akun yang sama), klik **Enable/Confirm**. Ini cuma perlu dilakukan sekali per akun/tailnet.

## 6. Nyalakan Funnel di port agent (sintaks terbaru)

Pastikan `apps/agent` sudah/akan berjalan di port `5125`, lalu jalankan:

```powershell
tailscale funnel --bg 5125
```

- `--bg` = jalan permanen di background, dan **otomatis aktif lagi setelah PC restart** (ini yang kita mau, jangan dilewatkan)
- `5125` = port lokal agent kamu

Kalau muncul pesan "Funnel is not enabled..." seperti di Langkah 5, selesaikan dulu langkah itu, baru ulangi perintah ini.

Cek status & lihat URL publiknya:
```powershell
tailscale funnel status
```
Akan muncul sesuatu seperti:
```
https://komputer-server.tailxxxx.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:5125
```

URL `https://komputer-server.tailxxxx.ts.net` itulah alamat publik permanennya.

### Kalau mau matikan Funnel-nya nanti
```powershell
tailscale funnel --bg 5125 off
```

## 7. Tes dari luar

Buka URL itu dari **HP dengan data seluler** (matikan WiFi rumah dulu). Harus merespons — boleh error 404/401 dari Express (artinya sudah nyambung ke agent), yang penting bukan timeout.

## 8. Set di Vercel

`STORVA_AGENT_URL = https://komputer-server.tailxxxx.ts.net` (sesuaikan dengan URL kamu, tanpa trailing slash) → **Save** → **Redeploy**.

---

## 9. Supaya jalan terus otomatis (persistent)

- **Tailscale service** — cek Task Manager → tab **Services** → cari `Tailscale`, pastikan **Running** & startup **Automatic**. Ini biasanya sudah otomatis begitu setelah install.
- **Funnel-nya sendiri** — karena dipasang pakai `--bg`, konfigurasinya tersimpan di tailnet, jadi otomatis aktif lagi setiap kali Tailscale service hidup (termasuk setelah PC restart) — tidak perlu ketik ulang `tailscale funnel --bg 5125`.
- **`apps/agent`-nya sendiri** — tetap pasang sebagai Windows Service pakai `agent-windows-service.ps1` yang sudah ada di project, supaya agent-nya juga otomatis nyala saat PC restart (bukan cuma tunnel-nya).

---

## Checklist akhir

- [ ] `apps/agent` jalan sebagai Windows Service (`agent-windows-service.ps1`)
- [ ] Fitur Funnel sudah di-enable di akun (Langkah 5)
- [ ] `tailscale funnel --bg 5125` berhasil, `tailscale funnel status` menunjukkan Funnel aktif
- [ ] URL `https://xxxx.tailXXXX.ts.net` bisa diakses dari HP pakai data seluler
- [ ] `STORVA_AGENT_URL` di Vercel sudah diisi URL itu, sudah redeploy
- [ ] Coba PC di-restart, tunggu beberapa menit, cek lagi URL-nya masih bisa diakses

## Batasan yang perlu diketahui

- Bandwidth di Funnel dibatasi Tailscale (angka pastinya tidak diumumkan resmi) — kalau Storva dipakai untuk transfer file besar/rutin, awasi kalau terasa lambat.
- URL selalu berformat `xxxx.tailXXXX.ts.net` — tidak bisa branded dengan domain sendiri di paket gratis.
