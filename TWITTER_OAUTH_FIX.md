# Fix Twitter OAuth 400 Error

## The Problem
Twitter is returning `400 Bad Request` when trying to authorize. This usually means:
1. **Callback URL mismatch** (most common)
2. Invalid client_id
3. App not configured for OAuth 2.0

## ✅ Step-by-Step Fix

### 1. Verify Twitter App Settings

Go to: **https://developer.twitter.com/en/portal/dashboard**

1. Select your app
2. Go to **"User authentication settings"**
3. Click **"Edit"** or **"Set up"**

### 2. Check These Settings EXACTLY:

**App permissions:**
- Must be: **"Read"** (not "Read and Write" or "Read and Write and Direct message")

**Type of App:**
- Must be: **"Web App"** (not "Native App" or "Single Page App")

**Callback URI / Redirect URL:**
- Must be EXACTLY: `https://social-profiler-backend.fly.dev/api/auth/twitter/callback`
- ✅ No trailing slash
- ✅ Must be HTTPS (not HTTP)
- ✅ Must match exactly (case-sensitive)

**Website URL:**
- Can be: `https://social-profiler-backend.fly.dev` (or your frontend URL)

### 3. Save and Wait

After saving:
- Wait 1-2 minutes for changes to propagate
- Twitter's changes can take a moment to sync

### 4. Verify OAuth 2.0 is Enabled

In your app settings:
- Look for **"OAuth 2.0"** section
- Make sure it shows **"Enabled"** or **"Active"**
- If you only see "OAuth 1.0a", you need to enable OAuth 2.0

### 5. Check Client ID Format

Your `TWITTER_CLIENT_ID` should look like:
- Format: `TOVRN1Q3WnA4bUhOVmYwLXluaTg6MTpjaQ` (long string)
- Found in: **"Keys and tokens"** → **"OAuth 2.0 Client ID and Client Secret"**

### 6. Test Again

1. Clear browser cache/cookies
2. Go to: `http://localhost:3000/register`
3. Click "Connect Twitter"
4. Should redirect to Twitter authorization page (not error)

---

## 🔍 If Still Not Working

### Check Backend Logs

```bash
cd backend
flyctl logs
```

Look for errors mentioning:
- "redirect_uri_mismatch"
- "invalid_client"
- "invalid_request"

### Verify Environment Variables

```bash
flyctl secrets list
```

Should show:
- `TWITTER_CLIENT_ID` ✅
- `TWITTER_CLIENT_SECRET` ✅
- `BACKEND_URL` ✅ (should be `https://social-profiler-backend.fly.dev`)

### Test Backend Endpoint

```bash
curl https://social-profiler-backend.fly.dev/api/auth/twitter
```

Should return JSON with `authUrl`, `state`, and `codeVerifier`.

---

## 🚨 Common Mistakes

1. ❌ Using `http://localhost:3001` in Twitter settings (won't work)
2. ❌ Trailing slash: `https://...fly.dev/api/auth/twitter/callback/` (wrong!)
3. ❌ Wrong app type: "Native App" instead of "Web App"
4. ❌ Wrong permissions: "Read and Write" instead of "Read"
5. ❌ OAuth 1.0a enabled instead of OAuth 2.0

---

## ✅ Correct Configuration Summary

```
App permissions: Read
Type of App: Web App
Callback URI: https://social-profiler-backend.fly.dev/api/auth/twitter/callback
Website URL: https://social-profiler-backend.fly.dev
OAuth 2.0: Enabled
```

After fixing, wait 1-2 minutes, then try again!


