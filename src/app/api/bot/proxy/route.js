import { NextResponse } from "next/server";
import axios from "axios";
import { SocksProxyAgent } from 'socks-proxy-agent';
import { mergeCookies } from "../../../../utils/proxyRequest";

// Create SOCKS proxy agent only if env var is set or if default local fallback is desired
const proxyUrl = process.env.SOCKS_PROXY || (process.env.NODE_ENV === "development" ? "socks://localhost:1080" : null);

let proxyAgent = null;
if (proxyUrl) {
    try {
        proxyAgent = new SocksProxyAgent(proxyUrl);
    } catch (e) {
        console.error("[BotProxy] Failed to initialize proxy agent:", e.message);
    }
}

// Create an axios instance
const api = axios.create({
  validateStatus: () => true,
  httpAgent: proxyAgent,
  httpsAgent: proxyAgent
});

const API_URL = "https://justapedia.org/api.php";
const USER_AGENT = "JPTools-Bot/1.0 (tools.justapedia.org; contact: skhsouravhalder@gmail.com)";

async function proxyRequest(request, method) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  // Headers to forward
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
    "Origin": "https://justapedia.org",
    "Referer": "https://justapedia.org/",
  };
  
  // 1. Retrieve Bot Session from "bot_auth_data" cookie
  // This cookie contains the encrypted/encoded session cookies for the bot
  const botCookie = request.cookies.get("bot_auth_data");
  let currentSessionCookies = "";
  
  if (botCookie && botCookie.value) {
      try {
        // We assume the cookie value is a JSON string of the cookie header to send
        // Or simply the raw cookie string if we stored it that way
        // Let's assume we store it as a simple string for now
        currentSessionCookies = Buffer.from(botCookie.value, 'base64').toString('utf-8');
        headers["Cookie"] = currentSessionCookies;
        console.log("[BotProxy] Using Bot Session");
      } catch (e) {
          console.error("[BotProxy] Failed to decode bot cookie", e);
      }
  } else {
      console.warn("[BotProxy] No bot session found. Request might fail if login is required.");
      return NextResponse.json(
          { error: "Bot not authenticated. Please log in as the bot." },
          { status: 401 }
      );
  }

  // Request Config
  const config = {
    method: method,
    url: API_URL,
    headers: headers,
    params: Object.fromEntries(searchParams), 
  };

  if (method === "POST") {
    const contentType = request.headers.get("content-type") || "application/x-www-form-urlencoded";
    config.headers["Content-Type"] = contentType;
    const body = await request.text();
    config.data = body;
  }

  try {
    const response = await api(config);
    
    // Create response
    const nextResponse = NextResponse.json(response.data, { status: response.status });

    // Handle Set-Cookie from upstream
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
        let newCookies = [];
        if (Array.isArray(setCookieHeaders)) {
             newCookies = setCookieHeaders.map(c => c.split(';')[0]);
        } else {
             newCookies = [setCookieHeaders.split(';')[0]];
        }
        
        // Merge with existing session cookies
        const updatedCookies = mergeCookies(currentSessionCookies, newCookies);
        
        // Update the bot_auth_data cookie
        if (updatedCookies !== currentSessionCookies) {
            console.log("[BotProxy] Updating bot session cookies");
            const encodedCookies = Buffer.from(updatedCookies).toString('base64');
            nextResponse.cookies.set("bot_auth_data", encodedCookies, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
        }
    }

    return nextResponse;

  } catch (error) {
    console.error("Bot Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Bot Proxy Failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return proxyRequest(request, "GET");
}

export async function POST(request) {
  return proxyRequest(request, "POST");
}
