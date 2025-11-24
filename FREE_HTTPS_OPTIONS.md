# Free HTTPS Options for OAuth Callbacks

## ✅ Railway (Best Option)
- **Free:** $1/month credit (non-rollover)
- **New users:** $5 credit for first 30 days
- **Stable URL:** Yes, permanent
- **No spin-down:** Services stay running
- **HTTPS:** Included
- **Setup:** 5 minutes via GitHub

**Verdict:** Best for development/testing. $1/month is basically free.

---

## ⚠️ Render (Has Free Tier)
- **Free:** 750 hours/month (1 service 24/7)
- **Spin-down:** After 15 minutes inactivity (cold starts ~30s)
- **Stable URL:** Yes, permanent
- **HTTPS:** Included
- **Setup:** 5 minutes via GitHub

**Verdict:** Free but cold starts can be annoying for OAuth.

---

## ✅ Fly.io (You Deleted This)
- **Free:** 3 shared-cpu VMs, 256MB RAM each
- **Stable URL:** Yes, permanent
- **HTTPS:** Included
- **Setup:** Docker deployment

**Verdict:** Good option if you want to recreate account.

---

## ✅ Cloudflare Tunnel (Free, No Account Needed)
- **Free:** Completely free
- **Stable URL:** Yes (with domain) or dynamic
- **HTTPS:** Included
- **Setup:** Install `cloudflared`, run tunnel

**Verdict:** Good for local dev, but URL changes unless you have a domain.

---

## ✅ Vercel (Free Tier)
- **Free:** Serverless functions
- **Stable URL:** Yes, permanent
- **HTTPS:** Included
- **Setup:** GitHub integration

**Verdict:** Good but need to adapt backend for serverless.

---

## Recommendation

**For OAuth callbacks, use Railway:**
1. $1/month is essentially free
2. No cold starts (services stay running)
3. Stable HTTPS URL
4. Easy GitHub deployment

**Quick Setup:**
1. Go to: https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub
4. Select `social-profiler` repo
5. Set Root Directory: `backend`
6. Add environment variables
7. Deploy!

**Your backend will be at:** `https://your-app.up.railway.app`

