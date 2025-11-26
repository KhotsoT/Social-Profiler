# Start Cloudflare Tunnel for HTTPS OAuth callbacks
# Alternative to ngrok (which is blocked)

Write-Host "=== STARTING CLOUDFLARE TUNNEL ===" -ForegroundColor Cyan
Write-Host "This will create an HTTPS URL for OAuth callbacks" -ForegroundColor Yellow
Write-Host ""

# Check if cloudflared is installed
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredPath) {
    Write-Host "ERROR: cloudflared is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install options:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host "2. Or use Chocolatey: choco install cloudflared" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing, add cloudflared to your PATH" -ForegroundColor Yellow
    exit 1
}

# Check if port 3001 is in use
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if (-not $port) {
    Write-Host "WARNING: Backend is not running on port 3001!" -ForegroundColor Yellow
    Write-Host "Start backend first: cd backend && yarn dev" -ForegroundColor Yellow
    Write-Host ""
}

# Start cloudflared tunnel
Write-Host "Starting Cloudflare tunnel on port 3001..." -ForegroundColor Green
Write-Host ""
Write-Host "Your HTTPS URL will be displayed below:" -ForegroundColor Cyan
Write-Host "Copy this URL and update:" -ForegroundColor Yellow
Write-Host "1. .env file: BACKEND_URL=https://your-url.trycloudflare.com" -ForegroundColor White
Write-Host "2. Twitter OAuth callback: https://your-url.trycloudflare.com/api/auth/twitter/callback" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

# Check if cloudflared.exe exists in current directory
if (Test-Path "cloudflared.exe") {
    .\cloudflared.exe tunnel --url http://localhost:3001
} else {
    # Try system-wide cloudflared
    cloudflared tunnel --url http://localhost:3001
}

