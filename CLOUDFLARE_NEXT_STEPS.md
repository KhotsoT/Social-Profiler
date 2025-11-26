# Cloudflare Tunnel - Next Steps

## ✅ What You Have Now

**Your HTTPS URL:**
```
https://disco-friendly-dated-framed.trycloudflare.com
```

**Status:**
- ✅ Tunnel is running
- ✅ Backend is running on port 3001
- ✅ .env updated with BACKEND_URL

## 📋 What To Do Next

### Step 1: Restart Backend (IMPORTANT!)
The backend needs to restart to pick up the new `BACKEND_URL`:

1. Stop backend (Ctrl+C in backend terminal)
2. Restart: `cd backend && yarn dev`

### Step 2: Update Twitter OAuth Callback

1. Go to: **https://developer.twitter.com/en/portal/dashboard**
2. Select your app
3. Go to **"User authentication settings"**
4. Update **Callback URI** to:
   ```
   https://disco-friendly-dated-framed.trycloudflare.com/api/auth/twitter/callback
   ```
5. Update **Website URL** to:
   ```
   https://disco-friendly-dated-framed.trycloudflare.com
   ```
6. Click **"Save"**

### Step 3: Test OAuth

1. Go to: **http://localhost:3000/register**
2. Click **"Connect Twitter"**
3. It should redirect to Twitter for authorization
4. After authorizing, it should redirect back to your app

## ⚠️ Important Notes

- **Keep the tunnel running!** Don't close the terminal with `cloudflared.exe`
- **URL changes on restart:** If you restart the tunnel, you'll get a new URL
- **Update URLs when tunnel restarts:** You'll need to update `.env` and Twitter OAuth again

## 🎉 You're Done!

Your backend now has HTTPS for OAuth callbacks!

