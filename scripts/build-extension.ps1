param(
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeScript = Join-Path $repoRoot "scripts\build-extension.mjs"
$node = (Get-Command node -ErrorAction Stop).Source
$arguments = @($nodeScript)

if ($OutDir) {
  $arguments += "--out-dir"
  $arguments += $OutDir
}

Set-Location $repoRoot
& $node @arguments
