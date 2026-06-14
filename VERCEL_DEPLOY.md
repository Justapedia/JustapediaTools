# Deploying to Vercel

## Prerequisites

1. **GitHub Account**: Your code must be pushed to a GitHub repository.
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3. **Justapedia cloud access**: See [CLOUD_SETUP.md](CLOUD_SETUP.md) for MediaWiki and Cloudflare settings.

## Step-by-Step Guide

### 1. Push to GitHub

Ensure your latest code is on GitHub.

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Select your `Justapedia` repository and click **Import**.

### 3. Configure environment variables

In **Settings → Environment Variables**, add:

| Variable | Example | Required |
|----------|---------|----------|
| `NODE_ENV` | `production` | Yes |
| `JPTOOLS_PUBLIC_URL` | `https://tools.justapedia.org` | Yes |
| `JPTOOLS_AUTO_LOGIN_USERNAME` | service account name | Recommended |
| `JPTOOLS_AUTO_LOGIN_PASSWORD` | service account password | Recommended |

Use your Vercel production domain in `JPTOOLS_PUBLIC_URL` if you are not using a custom domain yet, and whitelist that domain in MediaWiki (see [CLOUD_SETUP.md](CLOUD_SETUP.md)).

### 4. Deploy

Click **Deploy**. Vercel builds the app and assigns a domain.

On first visit, the server signs in through the Justapedia API automatically when credentials are configured. Users do not need to enter a password.

## Troubleshooting

### "Upstream Blocked" or "403 Forbidden"

The Vercel server IP may be blocked by Cloudflare. See [CLOUD_SETUP.md](CLOUD_SETUP.md) — allow the `JPTools` User-Agent or deployment IPs.

### "500 Internal Server Error" on Login

Check Vercel **Function Logs** for `[Session]` or `[Login]` messages. Common causes: wrong credentials, return URL not whitelisted, or CAPTCHA on the service account.

### Auto-login not working

1. Confirm env vars are set for the **Production** environment.
2. Redeploy after changing variables.
3. Run `GET /api/bot/login` on your deployment — `autoLoginConfigured` should be `true`.
