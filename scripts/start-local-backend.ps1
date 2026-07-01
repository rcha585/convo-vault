param(
  [string]$CacheDir = "D:\Programs\ChatGPTConversationExporter",
  [int]$Port = 38474,
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $repoRoot "tools\advanced-pdf\server.js"

if (-not (Test-Path $serverScript)) {
  throw "Cannot find backend server script: $serverScript"
}

$node = (Get-Command node -ErrorAction Stop).Source

$env:CGCE_CACHE_DIR = $CacheDir
$env:CGCE_ADVANCED_PDF_PORT = [string]$Port

if ($Headless) {
  $env:CGCE_CAPTURE_HEADLESS = "1"
} else {
  Remove-Item Env:\CGCE_CAPTURE_HEADLESS -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

Write-Host "Starting ChatGPT Conversation Exporter local backend"
Write-Host "Repo:      $repoRoot"
Write-Host "Cache:     $CacheDir"
Write-Host "Endpoint:  http://127.0.0.1:$Port"
Write-Host ""
Write-Host "Keep this window open while exporting. Press Ctrl+C to stop."
Write-Host ""

Set-Location $repoRoot
& $node $serverScript
