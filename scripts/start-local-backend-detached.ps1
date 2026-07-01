param(
  [string]$CacheDir = "D:\Programs\ChatGPTConversationExporter",
  [int]$Port = 38474,
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts\start-local-backend.ps1"
$logDir = Join-Path $repoRoot "tmp"
$stdout = Join-Path $logDir "local-backend.out.log"
$stderr = Join-Path $logDir "local-backend.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$scriptPath`"",
  "-CacheDir", "`"$CacheDir`"",
  "-Port", "$Port"
)

if ($Headless) {
  $arguments += "-Headless"
}

$process = Start-Process -FilePath "powershell.exe" `
  -ArgumentList $arguments `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Start-Sleep -Seconds 2

Write-Host "Started local backend process: $($process.Id)"
Write-Host "Health: http://127.0.0.1:$Port/health"
Write-Host "Stdout: $stdout"
Write-Host "Stderr: $stderr"
