# LocalTunnel - Complete Guide

## What is LocalTunnel?

LocalTunnel is a **free, open-source npm package** that creates an HTTPS tunnel to your localhost. It's similar to ngrok but:
- ✅ No account required
- ✅ No download needed (just npm)
- ✅ Completely free
- ✅ Works on Windows, Mac, Linux
- ✅ Simple command-line interface

## How It Works

1. Install via npm: `npm install -g localtunnel`
2. Run: `lt --port 3001`
3. Get a URL like: `https://random-name.loca.lt`
4. All traffic to that URL is tunneled to your `localhost:3001`

## Pros ✅

- **Completely FREE** - No credit card, no account
- **Easy Setup** - Just npm install and run
- **HTTPS Included** - Perfect for OAuth callbacks
- **No Microsoft Blocking** - It's just an npm package
- **Stable URL** - URL stays the same as long as process runs
- **Open Source** - You can self-host if needed
- **No Limits** - Free tier has no time/request limits

## Cons ⚠️

- **URL Changes** - Each time you restart, you get a new URL
- **Must Keep Running** - Terminal must stay open
- **No Custom Domain** - You get random names like `random-name.loca.lt`
- **Public URL** - Anyone with the URL can access (but it's random)
- **No Dashboard** - No web interface to see requests

## Installation

### Option 1: Global Install (Recommended)
```powershell
npm install -g localtunnel
```

### Option 2: Local Install
```powershell
npm install localtunnel
npx localtunnel --port 3001
```

## Usage

### Basic Usage
```powershell
lt --port 3001
```

Output:
```
your url is: https://random-name.loca.lt
```

### Custom Subdomain (if available)
```powershell
lt --port 3001 --subdomain myapp
```
Gives you: `https://myapp.loca.lt` (if available)

### Keep URL Stable
The URL stays the same as long as:
- The process keeps running
- You don't restart it
- Your computer doesn't sleep

## Setup for OAuth

### Step 1: Start Backend
```powershell
cd backend
yarn dev
```

### Step 2: Start Tunnel (New Terminal)
```powershell
lt --port 3001
```

Copy the URL it gives you (e.g., `https://random-name.loca.lt`)

### Step 3: Update .env
```env
BACKEND_URL=https://random-name.loca.lt
```

### Step 4: Update Twitter OAuth
1. Go to Twitter Developer Portal
2. Update Callback URI to:
   ```
   https://random-name.loca.lt/api/auth/twitter/callback
   ```

### Step 5: Restart Backend
```powershell
# Stop backend (Ctrl+C)
# Restart it
cd backend
yarn dev
```

## Keeping It Running

### Option 1: Keep Terminal Open
Just leave the terminal window open. The tunnel stays active.

### Option 2: Run in Background (Windows)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "lt --port 3001"
```

### Option 3: Use PM2 (Process Manager)
```powershell
npm install -g pm2
pm2 start "lt --port 3001" --name tunnel
pm2 save
pm2 startup
```

## Troubleshooting

### "Port already in use"
Make sure nothing else is using port 3001:
```powershell
Get-NetTCPConnection -LocalPort 3001
```

### "Connection refused"
Make sure your backend is running on port 3001 first!

### URL changes on restart
This is normal. You'll need to:
1. Update `.env` with new URL
2. Update Twitter OAuth callback
3. Restart backend

### Slow responses
LocalTunnel free tier can be slower than paid services, but it's usually fine for development.

## Comparison

| Feature | LocalTunnel | ngrok | Cloudflare Tunnel |
|---------|-------------|-------|-------------------|
| Free | ✅ Yes | ✅ Yes | ✅ Yes |
| Account Needed | ❌ No | ✅ Yes | ❌ No (basic) |
| Installation | npm install | Download exe | Download exe |
| Windows Support | ✅ Yes | ✅ Yes | ✅ Yes |
| Stable URL | ⚠️ Per session | ⚠️ Per session | ⚠️ Per session |
| Custom Domain | ❌ No | ✅ Paid | ✅ With domain |
| Speed | Medium | Fast | Fast |
| Dashboard | ❌ No | ✅ Yes | ✅ Yes |

## Best Use Cases

✅ **Perfect for:**
- Local development with OAuth
- Testing webhooks
- Sharing local app temporarily
- Quick HTTPS for development

❌ **Not ideal for:**
- Production deployments
- Long-term stable URLs
- High-traffic applications
- Custom domains

## Recommendation

**For your OAuth setup, LocalTunnel is great because:**
1. ✅ Completely free
2. ✅ No account needed
3. ✅ Easy npm install
4. ✅ Works on Windows
5. ✅ HTTPS included
6. ✅ No Microsoft blocking

**Just remember:**
- Keep the terminal open
- Update URLs when you restart
- It's for development, not production

## Quick Start Script

Create `start-localtunnel.ps1`:
```powershell
Write-Host "Starting LocalTunnel on port 3001..." -ForegroundColor Green
lt --port 3001
```

Run it:
```powershell
.\start-localtunnel.ps1
```

## Done! 🚀

LocalTunnel is perfect for getting OAuth working locally with HTTPS!

