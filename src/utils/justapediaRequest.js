import axios from "axios";
import { getJustapediaConfig } from "../config/justapedia";

export function buildApiHeaders(extraHeaders = {}) {
  const config = getJustapediaConfig();
  return {
    "User-Agent": config.userAgent,
    Accept: "application/json",
    ...extraHeaders,
  };
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
  const axiosConfig = {
    timeout: 30000,
    validateStatus: () => true,
    maxRedirects: 0,
    ...config,
    headers: {
      Accept: "application/json",
      ...config.headers,
    },
  };

  try {
    const res = await axios(axiosConfig);
    let data = res.data;
    if (typeof data === "string" && data.trim().startsWith("{")) {
      try {
        data = JSON.parse(data);
      } catch {
        // Keep raw string when it is not JSON.
      }
    }

    return {
      status: res.status,
      data,
      cookies: extractSetCookies(res.headers),
      location: res.headers?.location || null,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`[JustapediaRequest] Failed: ${msg} | URL: ${config.url}`);
    throw new Error(`Justapedia API request failed: ${msg}`);
  }
}
