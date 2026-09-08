# Powershell script to install Storva Agent as a Windows Service using NSSM
# Requires NSSM installed and in PATH

param(
    [string]$ServiceName = "StorvaAgent",
    [string]$NodePath = "$(where.exe node)",
    [string]$AgentScript = "C:\path\to\storva\apps\agent\dist\index.js",
    [string]$WorkingDirectory = "C:\path\to\storva",
    [int]$Port = 5125
)

# Install service
nssm install $ServiceName $NodePath $AgentScript
nssm set $ServiceName AppDirectory $WorkingDirectory
nssm set $ServiceName AppParameters "--port $Port"
# Auto restart on failure
nssm set $ServiceName Start SERVICE_AUTO_START
nssm set $ServiceName AppRestartDelay 5000

Write-Output "Installed $ServiceName service using NSSM."
