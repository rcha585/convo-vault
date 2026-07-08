param(
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $OutDir) {
  $OutDir = Join-Path $repoRoot "dist"
}

$outRoot = New-Item -ItemType Directory -Force -Path $OutDir
$extensionDir = Join-Path $outRoot.FullName "convo-vault-extension"
$zipPath = Join-Path $outRoot.FullName "convo-vault-extension.zip"

if (Test-Path $extensionDir) {
  Remove-Item -LiteralPath $extensionDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $extensionDir | Out-Null

$extensionFiles = @(
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js"
)

foreach ($file in $extensionFiles) {
  $source = Join-Path $repoRoot $file

  if (-not (Test-Path $source)) {
    throw "Missing extension file: $source"
  }

  Copy-Item -LiteralPath $source -Destination (Join-Path $extensionDir $file)
}

$iconSourceDir = Join-Path $repoRoot "assets\icons"
$iconOutputDir = Join-Path $extensionDir "assets\icons"

if (-not (Test-Path $iconSourceDir)) {
  throw "Missing extension icon directory: $iconSourceDir"
}

New-Item -ItemType Directory -Force -Path $iconOutputDir | Out-Null
Copy-Item -LiteralPath (Join-Path $iconSourceDir "icon-16.png") -Destination $iconOutputDir -Force
Copy-Item -LiteralPath (Join-Path $iconSourceDir "icon-32.png") -Destination $iconOutputDir -Force
Copy-Item -LiteralPath (Join-Path $iconSourceDir "icon-48.png") -Destination $iconOutputDir -Force
Copy-Item -LiteralPath (Join-Path $iconSourceDir "icon-128.png") -Destination $iconOutputDir -Force

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $extensionDir "*") -DestinationPath $zipPath -Force

Write-Host "Extension folder: $extensionDir"
Write-Host "Extension zip:    $zipPath"
Write-Host ""
Write-Host "Chrome development mode still uses Load unpacked with the extension folder."
Write-Host "Use the zip for sharing or archiving; unzip it before Load unpacked if needed."
