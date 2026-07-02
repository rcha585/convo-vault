param(
  [string]$CacheDir = "D:\Programs\ChatGPTConversationExporter",
  [int]$Port = 38474,
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts\start-local-backend.ps1"

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

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = "powershell.exe"
$startInfo.WorkingDirectory = [string]$repoRoot
$startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true

foreach ($argument in $arguments) {
  [void]$startInfo.ArgumentList.Add($argument)
}

$pathValue = $startInfo.EnvironmentVariables["Path"]
if (-not $pathValue) {
  $pathValue = $startInfo.EnvironmentVariables["PATH"]
}
$startInfo.EnvironmentVariables.Remove("PATH")
if ($pathValue) {
  $startInfo.EnvironmentVariables["Path"] = $pathValue
}

$process = [System.Diagnostics.Process]::Start($startInfo)

Start-Sleep -Seconds 2

Write-Host "Started local backend process: $($process.Id)"
Write-Host "Health: http://127.0.0.1:$Port/health"
