# Deployment Guide for tools.justapedia.org

This guide assumes you are deploying to a Linux VPS (Ubuntu/Debian) and have SSH access.

## Prerequisites

1.  **Node.js 18+**: Ensure Node.js is installed.
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
2.  **PM2**: Process manager to keep the app running.
    ```bash
    sudo npm install -g pm2
    ```
3.  **Git**: To pull the latest code.
    ```bash
    sudo apt-get install -y git
    ```

## Step-by-Step Deployment

### 1. Clone/Pull the Repository

Navigate to your project directory (e.g., `/var/www/justapedia` or `~/justapedia`).

**First time:**
```bash
git clone https://github.com/souravhalder-dev/Justapedia.git justapedia
cd justapedia
```

**Updating existing:**
```bash
cd justapedia
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Proxy Configuration (Crucial)

Justapedia's API is protected by Cloudflare. If your VPS IP is blocked (returning 403 Forbidden), you **MUST** route traffic through a different IP address.

You have two options:

#### Option A: Use a Commercial Proxy (Recommended)
Buy a rotating residential proxy (e.g., Webshare, BrightData, Smartproxy).

1.  Open `ecosystem.config.js`:
    ```javascript
    // ...
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        SOCKS_PROXY: "socks5://user:pass@proxy-provider.com:port", // <--- Set this directly
      },
    // ...
    ```
2.  Remove the `socks-proxy` service from the list in `ecosystem.config.js` as it is not needed.

#### Option B: Use the Built-in SSH Tunnel (Jump Host)
If you have access to **another** VPS that is NOT blocked, you can use the built-in `socks-proxy.js` to tunnel traffic through it.

1.  Edit `ecosystem.config.js`:
    ```javascript
    // ...
    {
      name: "socks-proxy",
      script: "socks-proxy.js",
      // ...
      env: {
        SOCKS_PORT: 1080,
        SOCKS_HOST: "127.0.0.1",
        SSH_HOST: "YOUR_OTHER_SERVER_IP", // <--- The unblocked server
        SSH_USER: "root",
        SSH_PASSWORD: "your_password",
        // Or use key-based auth (edit socks-proxy.js if needed)
      }
    }
    // ...
    ```
2.  Ensure `justapedia-tools` is set to use this local tunnel:
    ```javascript
      env: {
        // ...
        SOCKS_PROXY: "socks://127.0.0.1:1080",
      },
    ```

### 4. Build and Start

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

This will start:
1.  `justapedia-tools`: The main Next.js web application.
2.  `socks-proxy`: The local proxy tunnel (if configured).

### 5. Restarting After Updates

Whenever you pull new code or change configuration:

```bash
npm run build
pm2 restart all
```

## Troubleshooting

-   **Check Logs:** `pm2 logs justapedia-tools`
-   **Check Proxy Logs:** `pm2 logs socks-proxy`
-   **403 Forbidden:**
    -   If you see 403 errors, it means the IP address making the request is blocked.
    -   If using **Option B**, ensure `SSH_HOST` is NOT the same as your current blocked server. You cannot tunnel through yourself to bypass a block.
    -   If using **Option A**, ensure your proxy provider is not blocked.
