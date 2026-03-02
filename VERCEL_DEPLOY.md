# Deploying to Vercel

Vercel is a great platform for hosting Next.js applications, but there is one **critical limitation** for this project:

> **You cannot run the built-in `socks-proxy.js` on Vercel.**

Vercel is "serverless", meaning it doesn't keep a server running 24/7 to host your background proxy. Therefore, you **MUST** use an external proxy service.

## Prerequisites

1.  **GitHub Account**: Your code must be pushed to a GitHub repository.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3.  **External Proxy**: You need a working SOCKS5 proxy URL (e.g., from Webshare, BrightData, or your own VPS).
    *   Format: `socks5://user:pass@host:port`

## Step-by-Step Guide

### 1. Push to GitHub

Ensure your latest code is on GitHub.

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Import to Vercel

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Select your `Justapedia` repository and click **Import**.

### 3. Configure Environment Variables (Crucial)

On the configuration screen, look for **Environment Variables**. You must add the following:

| Name | Value | Description |
|------|-------|-------------|
| `SOCKS_PROXY` | `socks5://user:pass@host:port` | **REQUIRED.** Your external proxy URL. |

**Why?**
Vercel's IP addresses are likely blocked by Cloudflare (Justapedia API). Without this `SOCKS_PROXY` variable pointing to a "clean" residential or unblocked proxy, your tool will get `403 Forbidden` errors.

### 4. Deploy

Click **Deploy**. Vercel will build your application and assign it a domain (e.g., `justapedia-tools.vercel.app`).

## Troubleshooting

### "Upstream Blocked" or "403 Forbidden"
If you see these errors after deploying:
1.  Check your `SOCKS_PROXY` variable in Vercel (Settings -> Environment Variables).
2.  Ensure the proxy you are using is **residential** or **high-quality**. Datacenter proxies (like cheap VPS IPs) are often blocked by Cloudflare.
3.  You can verify if the proxy works by testing it locally on your machine first.

### "500 Internal Server Error" on Login
Check the Vercel **Function Logs** (Dashboard -> Your Project -> Logs).
If you see "Proxy connection failed", your proxy URL is incorrect or the proxy is down.
