# LocalTunnel - When Does URL Change?

## What "Restart" Means

The URL changes when you **restart the LocalTunnel process** (the `lt --port 3001` command).

## What DOESN'T Change the URL ✅

- **Backend restart** - If you stop/restart your backend (`yarn dev`), the URL stays the same
- **Laptop sleep/wake** - If your laptop goes to sleep and wakes up, the URL stays the same
- **Closing terminal** - If you close the terminal window, the process stops (so URL is gone)
- **Computer restart** - If you restart your computer, the process stops (so URL is gone)

## What DOES Change the URL ❌

- **Stopping LocalTunnel** - If you press `Ctrl+C` in the terminal running `lt --port 3001`
- **Restarting LocalTunnel** - If you stop it and run `lt --port 3001` again, you get a NEW URL
- **Process crash** - If the LocalTunnel process crashes, restarting gives a new URL

## How It Works

1. **You run:** `lt --port 3001`
2. **You get:** `https://random-name-123.loca.lt`
3. **As long as that process keeps running**, the URL stays the same
4. **If you stop it** (Ctrl+C) and run it again, you get: `https://different-name-456.loca.lt`

## Real-World Scenario

### Day 1:
```powershell
# Terminal 1: Backend
cd backend
yarn dev  # Backend running on localhost:3001

# Terminal 2: LocalTunnel
lt --port 3001
# Output: https://myapp-abc123.loca.lt
```

You:
- Update `.env`: `BACKEND_URL=https://myapp-abc123.loca.lt`
- Update Twitter OAuth callback
- Test OAuth - it works! ✅

### Day 2 (Next Day):
You open your laptop:
- Backend might not be running (that's fine)
- LocalTunnel process is gone (closed terminal yesterday)

**You need to:**
1. Start backend: `cd backend && yarn dev`
2. Start LocalTunnel: `lt --port 3001`
3. **Get NEW URL:** `https://myapp-xyz789.loca.lt` (different!)
4. Update `.env` with new URL
5. Update Twitter OAuth callback with new URL

## Best Practice

**Keep LocalTunnel running in a separate terminal window:**
- Don't close that terminal
- Minimize it if needed
- The URL will stay the same as long as it's running

## Summary

- **URL changes:** Only when you stop and restart the `lt --port 3001` process
- **URL stays same:** As long as the LocalTunnel process keeps running
- **Backend restart:** Doesn't affect the URL
- **Laptop restart:** Process stops, so you need to restart LocalTunnel (new URL)

## Pro Tip

If you want to keep the same URL for days:
- Keep the LocalTunnel terminal open
- Don't close your laptop (or use "Keep running when lid closed")
- The URL will stay the same!

