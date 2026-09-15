# Powershell script to install Cloudflare Tunnel (for Storva Agent) as a Windows Service using NSSM
# Requires: cloudflared installed (winget install --id Cloudflare.cloudflared)
#           NSSM installed and in PATH
# Jalankan setelah kamu sudah:
#   1. cloudflared tunnel login
#   2. cloudflared tunnel create storva-agent
#   3. Mengisi C:\Users\<user>\.cloudflared\config.yml (lihat cloudflared-config.yml)
#   4. cloudflared tunnel route dns storva-agent agent.<domain-kamu>

param(
    [string]$ServiceName = "StorvaTunnel",
    [string]$CloudflaredPath = "$(where.exe cloudflared)",
    [string]$TunnelName = "storva-agent"
)

# Install service
nssm install $ServiceName $CloudflaredPath "tunnel run $TunnelName"
# Auto restart on failure
nssm set $ServiceName Start SERVICE_AUTO_START
nssm set $ServiceName AppRestartDelay 5000

Write-Output "Installed $ServiceName service using NSSM."
Write-Output "Tunnel akan otomatis jalan tiap kali Windows menyala, menghubungkan http://127.0.0.1:5125 ke internet."
Write-Output "Cek status: nssm status $ServiceName"
