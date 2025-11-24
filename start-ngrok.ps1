# Start ngrok tunnel for OAuth HTTPS callbacks
# This provides HTTPS for localhost:3001

Write-Host "=== STARTING NGROK TUNNEL ===" -ForegroundColor Cyan
Write-Host "This will create an HTTPS URL for OAuth callbacks" -ForegroundColor Yellow
Write-Host ""

# Check if ngrok is installed
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "ERROR: ngrok is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install ngrok:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extract ngrok.exe to a folder in your PATH" -ForegroundColor White
    Write-Host "3. Or run: choco install ngrok (if you have Chocolatey)" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the direct download:" -ForegroundColor Yellow
    Write-Host "iwr https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip -OutFile ngrok.zip" -ForegroundColor White
    Write-Host "Expand-Archive ngrok.zip" -ForegroundColor White
    exit 1
}

# Check if port 3001 is in use
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if (-not $port) {
    Write-Host "WARNING: Backend is not running on port 3001!" -ForegroundColor Yellow
    Write-Host "Start backend first: cd backend && yarn dev" -ForegroundColor Yellow
    Write-Host ""
}

# Kill any existing ngrok processes
Write-Host "Stopping any existing ngrok processes..." -ForegroundColor Yellow
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start ngrok
Write-Host "Starting ngrok tunnel on port 3001..." -ForegroundColor Green
Write-Host ""
Write-Host "Your HTTPS URL will be displayed below:" -ForegroundColor Cyan
Write-Host "Copy this URL and update:" -ForegroundColor Yellow
Write-Host "1. .env file: BACKEND_URL=https://your-ngrok-url.ngrok.io" -ForegroundColor White
Write-Host "2. Twitter OAuth callback: https://your-ngrok-url.ngrok.io/api/auth/twitter/callback" -ForegroundColor White
Write-Host ""

# Start ngrok in background
Start-Process -FilePath "ngrok" -ArgumentList "http", "3001" -NoNewWindow

Write-Host "ngrok started! Check the URL above." -ForegroundColor Green
Write-Host ""
Write-Host "To view ngrok dashboard: http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Yellow

