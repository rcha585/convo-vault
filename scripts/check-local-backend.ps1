param(
  [int]$Port = 38474
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeScript = Join-Path $repoRoot "scripts\check-local-backend.mjs"
$node = (Get-Command node -ErrorAction Stop).Source

Set-Location $repoRoot
& $node $nodeScript --port "$Port"
