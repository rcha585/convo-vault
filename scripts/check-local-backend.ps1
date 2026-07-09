param(
  [int]$Port = 38474,
  [string]$LocalApiToken = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeScript = Join-Path $repoRoot "scripts\check-local-backend.mjs"
$node = (Get-Command node -ErrorAction Stop).Source

Set-Location $repoRoot
if ($LocalApiToken) {
  $env:CGCE_LOCAL_API_TOKEN = $LocalApiToken
}
& $node $nodeScript --port "$Port"
