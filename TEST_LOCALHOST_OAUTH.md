# Test: Can We Use Localhost for Twitter OAuth?

## Current Situation
- **Twitter OAuth callback:** Currently set to `https://social-profiler-backend.fly.dev/api/auth/twitter/callback`
- **Question:** Can we use `http://localhost:3001/api/auth/twitter/callback` instead?

## Test Steps

### Step 1: Update Twitter App Settings
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Go to **"User authentication settings"**
4. Change **Callback URI** to: `http://localhost:3001/api/auth/twitter/callback`
5. Save

### Step 2: Test Local Backend
1. Make sure backend is running locally:
   ```bash
   cd backend
   yarn dev
   ```

2. Make sure `.env` has:
   ```env
   BACKEND_URL=http://localhost:3001
   TWITTER_CLIENT_ID=your_client_id
   TWITTER_CLIENT_SECRET=your_client_secret
   ```

3. Test OAuth flow:
   - Go to: http://localhost:3000/register
   - Click "Connect Twitter"
   - See if it works or gives an error

### Step 3: Check Results

**If it works:**
- ✅ Twitter allows localhost for OAuth 2.0
- ✅ We can delete Fly.io account
- ✅ Use local development only

**If it fails with "redirect_uri_mismatch" or similar:**
- ❌ Twitter requires HTTPS
- ❌ We need to keep Fly.io (or use another HTTPS solution)
- ❌ Localhost won't work

## Alternative: Use 127.0.0.1
Some OAuth providers accept `127.0.0.1` but not `localhost`. Try:
- `http://127.0.0.1:3001/api/auth/twitter/callback`

## Alternative: Use ngrok (Free Tier)
If Twitter requires HTTPS but you want local dev:
1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3001`
3. Use the HTTPS URL ngrok provides
4. Update Twitter callback to: `https://your-ngrok-url.ngrok.io/api/auth/twitter/callback`

**Note:** ngrok free tier has limitations (URL changes on restart, rate limits)

## Recommendation
**Test first** - Update Twitter callback to localhost and see if it works. If not, we'll need to keep Fly.io or use ngrok.


