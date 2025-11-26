# Fix 500 Error - Missing Twitter OAuth Credentials

## The Problem
The backend is returning a 500 error because `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` are missing from `.env`.

## Quick Fix

### Step 1: Get Twitter OAuth 2.0 Credentials

1. Go to: **https://developer.twitter.com/en/portal/dashboard**
2. Select your app
3. Go to **"Keys and tokens"** tab
4. Under **"OAuth 2.0 Client ID and Client Secret"**:
   - Copy **Client ID**
   - Copy **Client Secret** (click "Regenerate" if needed)

### Step 2: Add to .env

Open your `.env` file and add:

```env
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
```

Replace `your_client_id_here` and `your_client_secret_here` with your actual credentials.

### Step 3: Update Twitter OAuth Settings

1. Go to: **https://developer.twitter.com/en/portal/dashboard**
2. Select your app → **"User authentication settings"**
3. Update **Callback URI** to:
   ```
   https://disco-friendly-dated-framed.trycloudflare.com/api/auth/twitter/callback
   ```
4. Update **Website URL** to:
   ```
   https://disco-friendly-dated-framed.trycloudflare.com
   ```
5. Click **"Save"**

### Step 4: Restart Backend

After adding credentials, restart the backend:

```powershell
# Stop backend (Ctrl+C)
cd backend
yarn dev
```

### Step 5: Test

1. Go to: **http://localhost:3000/influencers/[id]/connect**
2. Click **"Connect Twitter"**
3. Should redirect to Twitter for authorization ✅

## Done! 🚀

Your OAuth should work now!

