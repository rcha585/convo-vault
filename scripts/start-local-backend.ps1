param(
  [string]$CacheDir = "",
  [int]$Port = 38474,
  [string]$BrowserPath = "",
  [string]$LocalApiToken = "",
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeScript = Join-Path $repoRoot "scripts\start-local-backend.mjs"
$node = (Get-Command node -ErrorAction Stop).Source
$arguments = @($nodeScript, "--port", "$Port")

if ($CacheDir) {
  $arguments += "--cache-dir"
  $arguments += $CacheDir
}

if ($BrowserPath) {
  $arguments += "--browser-path"
  $arguments += $BrowserPath
}

if ($Headless) {
  $arguments += "--headless"
}

Set-Location $repoRoot
if ($LocalApiToken) {
  $env:CGCE_LOCAL_API_TOKEN = $LocalApiToken
}
& $node @arguments
