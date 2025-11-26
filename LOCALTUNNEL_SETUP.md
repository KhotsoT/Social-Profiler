# LocalTunnel - Free HTTPS (npm package)

**Why LocalTunnel?**
- ✅ Completely FREE
- ✅ npm package (no download needed)
- ✅ Works on Windows
- ✅ Simple to use

## Quick Setup (2 minutes)

### Step 1: Install LocalTunnel
```powershell
npm install -g localtunnel
```

### Step 2: Start Tunnel
```powershell
lt --port 3001
```

This will give you a URL like:
```
https://random-name.loca.lt
```

### Step 3: Update Environment Variables
In your `.env` file:
```env
BACKEND_URL=https://random-name.loca.lt
```

### Step 4: Update Twitter OAuth
1. Go to Twitter Developer Portal
2. Update Callback URI to:
   ```
   https://random-name.loca.lt/api/auth/twitter/callback
   ```

### Step 5: Keep Tunnel Running
- Keep the terminal window open
- The URL stays the same as long as the process runs

## Note
- URL changes each time you restart
- Free tier has some limitations
- Works great for development!

## Done! 🚀

Your backend now has HTTPS for OAuth callbacks!

