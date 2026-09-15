# Setup Cloudflare Tunnel untuk Storva Agent

File pendukung: `cloudflared-config.yml`, `install-storva-tunnel-service.ps1`

Tujuan: memberi `apps/agent` (yang jalan di PC/NAS rumahmu, port `5125`) alamat HTTPS publik, supaya `apps/web` yang online di Vercel bisa menghubunginya lewat env var `STORVA_AGENT_URL`.

---

## Opsi A — Cepat, buat testing (tanpa domain, URL acak)

Cocok untuk coba dulu apakah semuanya nyambung, sebelum setup permanen.

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://127.0.0.1:5125
```

Terminal akan menampilkan URL seperti:
```
https://random-words-1234.trycloudflare.com
```

Isi itu ke `STORVA_AGENT_URL` di Vercel → redeploy → coba fitur storage di web.

⚠️ Kekurangan: URL berubah tiap kali `cloudflared` di-restart, dan tunnel mati kalau terminal ditutup. Hanya untuk uji coba.

---

## Opsi B — Permanen (pakai domain sendiri, disarankan untuk pemakaian sehari-hari)

Butuh: satu domain yang sudah didaftarkan ke Cloudflare (gratis, tinggal ganti nameserver domain ke Cloudflare kalau belum).

### 1. Install & login

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel login
```
Browser akan terbuka, pilih domain kamu untuk otorisasi.

### 2. Buat tunnel

```powershell
cloudflared tunnel create storva-agent
```
Catat `<TUNNEL_ID>` yang muncul di output — dipakai di `config.yml`.

### 3. Isi config

Salin `cloudflared-config.yml` ke `C:\Users\<user>\.cloudflared\config.yml`, lalu ganti:
- `<TUNNEL_ID>` → id dari langkah 2
- `<domain-kamu>` → domain milikmu, mis. `storva-kamu.com` (jadi `agent.storva-kamu.com`)
- path `credentials-file` sesuaikan dengan lokasi file `.json` hasil langkah 2 (biasanya otomatis ada di `~/.cloudflared/`)

### 4. Arahkan DNS

```powershell
cloudflared tunnel route dns storva-agent agent.<domain-kamu>
```
Ini otomatis membuat DNS record CNAME di Cloudflare untuk subdomain tadi.

### 5. Tes jalankan manual dulu

```powershell
cloudflared tunnel run storva-agent
```
Buka `https://agent.<domain-kamu>` di browser lain (bukan di PC yang sama) — harus merespons (boleh error 404/401 dari Express, yang penting bukan timeout, artinya tunnel sudah tersambung).

### 6. Pasang sebagai Windows Service (biar jalan terus otomatis)

Butuh **NSSM** (`winget install nssm` atau download dari nssm.cc), sama seperti cara agent Storva sendiri dipasang sebagai service (`agent-windows-service.ps1`).

```powershell
.\install-storva-tunnel-service.ps1
```

Cek statusnya:
```powershell
nssm status StorvaTunnel
```

### 7. Set di Vercel

`STORVA_AGENT_URL = https://agent.<domain-kamu>` → Save → Redeploy.

---

## Checklist akhir

- [ ] `apps/agent` jalan sebagai service (pakai `agent-windows-service.ps1` yang sudah ada di project)
- [ ] Cloudflare Tunnel jalan sebagai service (`install-storva-tunnel-service.ps1`)
- [ ] `https://agent.<domain-kamu>` bisa diakses dari luar jaringan rumah (tes pakai HP dengan data seluler, matikan WiFi)
- [ ] `STORVA_AGENT_URL` di Vercel sudah diisi URL itu, dan sudah redeploy
- [ ] Kedua service auto-start setelah PC restart (NSSM default-nya begitu)

## Alternatif kalau tidak mau pakai Cloudflare

- **Tailscale Funnel**: kalau sudah pakai Tailscale, tinggal `tailscale funnel 5125 on` — tidak butuh domain sendiri.
- **ngrok**: `ngrok http 5125` — paling cepat, tapi URL random tiap restart di paket gratis (sama seperti Opsi A).
