import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";

function getSocksAgent() {
  let proxy = process.env.SOCKS_PROXY;

  if (!proxy && process.env.NODE_ENV === "development") {
    proxy = "socks://localhost:1080";
  }

  if (!proxy) return null;

  // Use socks5h to resolve DNS through proxy
  const normalized = proxy.replace(/^socks5:\/\//, "socks5h://");

  console.log("[Proxy] Creating SOCKS proxy agent with:", normalized);
  const agent = new SocksProxyAgent(normalized);

  // Optional: Force IPv4 if your environment has flaky IPv6
  // Node's http(s) client reads this hint on sockets.
  agent.options = { ...(agent.options || {}), family: 4 };

  return agent;
}

function extractSetCookies(headers) {
  const setCookie = headers?.["set-cookie"];
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

export function mergeCookies(currentCookieHeader, setCookieArray) {
  const jar = new Map();

  if (currentCookieHeader) {
    currentCookieHeader
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const idx = pair.indexOf("=");
        if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      });
  }

  for (const sc of setCookieArray || []) {
    const firstPart = String(sc).split(";")[0];
    const idx = firstPart.indexOf("=");
    if (idx > 0) jar.set(firstPart.slice(0, idx).trim(), firstPart.slice(idx + 1).trim());
  }

  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export async function makeRequest(config) {
  // Always create a new agent to avoid stale connection issues
  const agent = getSocksAgent();

  const axiosConfig = {
    timeout: 30000,
    validateStatus: () => true,
    maxRedirects: 0,
    ...config,
    proxy: false, // IMPORTANT for custom agents
    httpAgent: agent || undefined,
    httpsAgent: agent || undefined,
  };

  try {
    const res = await axios(axiosConfig);
    return { status: res.status, data: res.data, cookies: extractSetCookies(res.headers) };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`[ProxyRequest] Failed: ${msg} | URL: ${config.url}`);
    throw new Error(`Proxy connection failed: ${msg}`);
  }
}
