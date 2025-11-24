# Fly.io Free Trial Management

## Your Trial Limits
- **Duration:** 7 days OR 2 hours of machine runtime
- **Whichever runs out first**
- **Current status:** Check Fly.io dashboard

## How to Check Trial Status

### Method 1: Fly.io Dashboard
1. Go to: https://fly.io/dashboard
2. Look at the right sidebar "Current month so far"
3. Check billing section for usage details

### Method 2: Fly CLI
```bash
flyctl status --app social-profiler-backend
flyctl billing status
```

## Optimizations Applied

### ✅ Machine Auto-Stop
- `min_machines_running = 0` - Machines stop when idle
- `auto_stop_machines = true` - Automatically stops unused machines
- `auto_start_machines = true` - Starts when requests come in

**This saves your trial hours!**

### ⚠️ Trade-off
- First request after idle period will be slower (cold start ~5-10 seconds)
- But saves precious trial hours

## What Happens When Trial Ends

1. **App stops working** - No requests will be processed
2. **Need payment method** - Add credit card to continue
3. **Or migrate** - Move to free alternatives (see below)

## Free Alternatives (If You Can't Pay)

### Option 1: Railway.app
- **Free tier:** $5/month credit (enough for small apps)
- **Easy migration:** Similar to Fly.io
- **Setup:** https://railway.app

### Option 2: Render.com
- **Free tier:** 750 hours/month (enough for 1 app)
- **Limitations:** Spins down after 15 min inactivity
- **Setup:** https://render.com

### Option 3: Local Development Only
- Run backend locally with `yarn dev`
- Use ngrok for OAuth callbacks (free tier available)
- No hosting costs

### Option 4: GitHub Codespaces / Gitpod
- Free tier for development
- Can run backend in cloud IDE
- Good for testing

## Maximizing Trial Time

1. **Stop machine when not testing:**
   ```bash
   flyctl machine stop <machine-id>
   ```

2. **Only start when needed:**
   ```bash
   flyctl machine start <machine-id>
   ```

3. **Monitor usage:**
   - Check dashboard daily
   - Track hours used
   - Plan accordingly

## Current Configuration

```toml
min_machines_running = 0  # Stops when idle
auto_stop_machines = true
auto_start_machines = true
memory_mb = 256  # Minimal memory
```

This configuration maximizes your trial time by only running when needed.

## Recommendation

**For development/testing:**
- Use local backend (`yarn dev` in backend folder)
- Only deploy to Fly.io when testing OAuth (needs HTTPS)
- This saves trial hours

**For production:**
- You'll need a payment method
- Or migrate to free alternative
- Or use local development + ngrok


