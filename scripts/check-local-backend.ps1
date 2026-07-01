param(
  [int]$Port = 38474
)

$ErrorActionPreference = "Stop"

$uri = "http://127.0.0.1:$Port/health"

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 5
  $response.Content
} catch {
  Write-Error "Local backend is not reachable at $uri. Start it with: powershell -ExecutionPolicy Bypass -File scripts\start-local-backend.ps1"
}
