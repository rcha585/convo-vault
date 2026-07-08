param(
  [string]$CacheDir = "",
  [int]$Port = 38474,
  [string]$BrowserPath = "",
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $repoRoot "tools\advanced-pdf\server.js"

if (-not (Test-Path $serverScript)) {
  throw "Cannot find backend server script: $serverScript"
}

$node = (Get-Command node -ErrorAction Stop).Source

if (-not $CacheDir) {
  $CacheDir = Join-Path $repoRoot ".convo-vault"
}

$env:CGCE_CACHE_DIR = $CacheDir
$env:CGCE_ADVANCED_PDF_PORT = [string]$Port

if ($BrowserPath) {
  $env:CGCE_RENDER_BROWSER_PATH = $BrowserPath
  $env:CGCE_EDGE_PATH = $BrowserPath
} else {
  Remove-Item Env:\CGCE_RENDER_BROWSER_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:\CGCE_EDGE_PATH -ErrorAction SilentlyContinue
}

if ($Headless) {
  $env:CGCE_CAPTURE_HEADLESS = "1"
} else {
  Remove-Item Env:\CGCE_CAPTURE_HEADLESS -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

Write-Host "Starting Convo Vault local backend"
Write-Host "Repo:      $repoRoot"
Write-Host "Cache:     $CacheDir"
Write-Host "Endpoint:  http://127.0.0.1:$Port"
if ($BrowserPath) {
  Write-Host "Browser:   $BrowserPath"
}
Write-Host ""
Write-Host "Keep this window open while exporting. Press Ctrl+C to stop."
Write-Host ""

Set-Location $repoRoot
& $node $serverScript
