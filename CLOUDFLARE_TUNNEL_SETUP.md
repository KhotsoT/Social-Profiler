# Cloudflare Tunnel - Free HTTPS (No Account Needed!)

**Why Cloudflare Tunnel?**
- ✅ Completely FREE
- ✅ Stable HTTPS URL (with domain) or dynamic URL
- ✅ No account required for basic use
- ✅ Works on Windows
- ✅ No Microsoft blocking

## Quick Setup (5 minutes)

### Step 1: Download Cloudflared
**Windows:**
1. Go to: https://github.com/cloudflare/cloudflared/releases
2. Download: `cloudflared-windows-amd64.exe`
3. Rename to: `cloudflared.exe`
4. Put it in a folder (e.g., `C:\cloudflared\`)
5. Add that folder to your PATH

**Or use Chocolatey:**
```powershell
choco install cloudflared
```

### Step 2: Start Tunnel
```powershell
cloudflared tunnel --url http://localhost:3001
```

This will give you a URL like:
```
https://random-words-1234.trycloudflare.com
```

### Step 3: Update Environment Variables
In your `.env` file:
```env
BACKEND_URL=https://random-words-1234.trycloudflare.com
```

### Step 4: Update Twitter OAuth
1. Go to Twitter Developer Portal
2. Update Callback URI to:
   ```
   https://random-words-1234.trycloudflare.com/api/auth/twitter/callback
   ```

### Step 5: Keep Tunnel Running
The tunnel URL changes each time you restart. To keep it stable:
- Keep the terminal window open
- Or use a service to run it in background

## For Stable URL (Optional)
If you have a domain, you can create a permanent tunnel:
1. Sign up for free Cloudflare account
2. Add your domain
3. Create named tunnel (permanent URL)

## Done! 🚀

Your backend now has HTTPS for OAuth callbacks!

