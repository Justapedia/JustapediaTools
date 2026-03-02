module.exports = {
  apps: [
    {
      name: "tools-justapedia",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        SOCKS_PROXY: "socks5://127.0.0.1:1080",
      },
    },
    {
      name: "socks-proxy",
      script: "socks-proxy.js",
      env: {
        SOCKS_PORT: 1080,
        SOCKS_HOST: "127.0.0.1",
        SSH_HOST: process.env.SSH_HOST,
        SSH_USER: process.env.SSH_USER,
        SSH_PASSWORD: process.env.SSH_PASSWORD,
      }
    }
  ],
};
