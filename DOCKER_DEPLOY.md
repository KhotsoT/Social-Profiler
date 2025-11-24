# Deploy Backend with Docker

**Goal:** Get your backend running with HTTPS so OAuth callbacks work.

**Why Docker?** 
- Containerized, works anywhere
- Easy deployment to cloud platforms
- Free HTTPS included

## 🚀 Quick Deploy: Fly.io (Recommended)

**Why Fly.io?**
- ✅ Free tier with HTTPS
- ✅ Built for Docker
- ✅ Simple CLI commands
- ✅ Automatic SSL certificates

### Step 1: Install Fly CLI

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login
```bash
fly auth login
```
(Opens browser to sign in)

### Step 3: Deploy Backend

```bash
cd backend
fly launch
```

**What happens:**
- Fly detects your `Dockerfile` automatically
- Asks for app name (or use default)
- Creates `fly.toml` config (already created for you!)

### Step 4: Set Environment Variables

```bash
fly secrets set DATABASE_URL=your_database_url
fly secrets set BACKEND_URL=https://your-app.fly.dev
fly secrets set TWITTER_CLIENT_ID=your_client_id
fly secrets set TWITTER_CLIENT_SECRET=your_client_secret
# Add all other OAuth credentials...
```

**Or set them in Fly dashboard:**
1. Go to https://fly.io/dashboard
2. Select your app
3. Go to "Secrets" tab
4. Add each variable

### Step 5: Deploy!

```bash
fly deploy
```

**Done!** You'll get a URL like: `https://your-app.fly.dev`

### Step 6: Update OAuth Callback URLs

Once deployed, update your OAuth app settings:

**Twitter:**
- Callback URI: `https://your-app.fly.dev/api/auth/twitter/callback`

**Instagram:**
- Callback URI: `https://your-app.fly.dev/api/auth/instagram/callback`

**YouTube:**
- Callback URI: `https://your-app.fly.dev/api/auth/youtube/callback`

(And so on for other platforms)

---

## Other Deployment Options

### Option 1: Fly.io (Best for Docker, Free Tier)

**Why Fly.io?**
- Free tier with HTTPS included
- Built for Docker
- Global edge network
- Easy CLI deployment

**Steps:**
1. Install Fly CLI:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Create app:
   ```bash
   fly launch --name social-profiler-backend
   ```
   - Select backend directory when asked
   - It will detect Dockerfile automatically

4. Set environment variables:
   ```bash
   fly secrets set DATABASE_URL=your_db_url
   fly secrets set BACKEND_URL=https://your-app.fly.dev
   fly secrets set TWITTER_CLIENT_ID=your_id
   fly secrets set TWITTER_CLIENT_SECRET=your_secret
   # ... add all other secrets
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

6. Get your HTTPS URL:
   - Fly gives you: `https://your-app.fly.dev`
   - Use this for OAuth callbacks!

---

### Option 2: Railway (Docker Support)

**Steps:**
1. Go to: https://railway.app
2. New Project → Deploy from GitHub
3. Select your repo
4. Railway will detect `docker-compose.yml` OR you can:
   - Set **Root Directory** to `backend`
   - Railway will use the Dockerfile
5. Add environment variables in dashboard
6. Deploy → Get HTTPS URL

---

### Option 3: Render (Docker Support)

**Steps:**
1. Go to: https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Docker Context:** `backend`
5. Add environment variables
6. Deploy → Get HTTPS URL

---

### Option 4: DigitalOcean App Platform

**Steps:**
1. Go to: https://cloud.digitalocean.com/apps
2. Create App → GitHub
3. Select repo
4. Add Component → Web Service
5. Settings:
   - **Source Directory:** `backend`
   - **Dockerfile Path:** `backend/Dockerfile`
6. Add environment variables
7. Deploy → Get HTTPS URL (free SSL)

---

## Local Docker Build Test

Before deploying, test locally:

```bash
# Build backend
cd backend
docker build -t social-profiler-backend .

# Run it
docker run -p 3001:3001 \
  -e DATABASE_URL=your_db_url \
  -e BACKEND_URL=http://localhost:3001 \
  social-profiler-backend

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up
```

---

## Production Dockerfile Check

Make sure `backend/Dockerfile` is production-ready:
- ✅ Multi-stage build (smaller image)
- ✅ Runs `yarn build` before start
- ✅ Uses `yarn start` (not `yarn dev`)
- ✅ Non-root user
- ✅ Health check

---

## After Deployment

1. **Get your HTTPS URL** (e.g., `https://your-app.fly.dev`)

2. **Update OAuth Settings:**
   - Twitter: `https://your-app.fly.dev/api/auth/twitter/callback`
   - Instagram: `https://your-app.fly.dev/api/auth/instagram/callback`
   - etc.

3. **Update Environment Variables:**
   ```env
   BACKEND_URL=https://your-app.fly.dev
   ```

4. **Test:**
   ```bash
   curl https://your-app.fly.dev/api/health
   ```

---

## Recommended: Fly.io

**Why?**
- ✅ Free tier with HTTPS
- ✅ Built for Docker
- ✅ Fast global network
- ✅ Easy CLI
- ✅ Automatic SSL certificates

**Quick Start:**
```bash
# Install
iwr https://fly.io/install.ps1 -useb | iex

# Deploy
cd backend
fly launch
fly deploy
```

Done! You get `https://your-app.fly.dev` with HTTPS! 🚀

