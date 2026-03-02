import { NextResponse } from "next/server";
import { makeRequest } from "../../../utils/proxyRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_AGENT = "JPTools/1.0 (tools.justapedia.org; contact: skhsouravhalder@gmail.com)";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const socksProxy = process.env.SOCKS_PROXY || (process.env.NODE_ENV === "development" ? "socks://localhost:1080" : null);

  if (!socksProxy) {
    return NextResponse.json(
      {
        error: "Missing SOCKS_PROXY",
        message: "SOCKS_PROXY env var is not set",
      },
      { status: 500 }
    );
  }

  // Restore session cookies from bot_auth_data if present
  // This allows the user to be "logged in" on the upstream site
  const botAuthCookie = request.cookies.get("bot_auth_data");
  let cookieHeader = "";

  if (botAuthCookie?.value) {
    try {
      cookieHeader = Buffer.from(botAuthCookie.value, "base64").toString("utf-8");
      console.log("[Proxy] Restored session cookies from bot_auth_data");
    } catch (e) {
      console.error("[Proxy] Failed to decode bot_auth_data cookie:", e.message);
    }
  } else {
    console.log("[Proxy] No bot_auth_data cookie found (Anonymous request)");
  }

  const config = {
    method: "GET",
    url: "https://justapedia.org/api.php",
    params: Object.fromEntries(searchParams),
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
      // Only forward the restored session cookies, not raw browser cookies
      Cookie: cookieHeader,
    },
  };

  try {
    const result = await makeRequest(config);
    
    // result.data might be an object (if axios parsed JSON) or string
    // NextResponse.json handles both
    
    return NextResponse.json(result.data, { 
        status: result.status,
        headers: {
            "Content-Type": "application/json"
        }
    });
  } catch (e) {
    console.error("Proxy Request Error:", e);
    return NextResponse.json({
        error: "Proxy connection failed",
        message: e.message,
        hint: "Check SOCKS_PROXY availability and upstream connection.",
        proxy_configured: !!process.env.SOCKS_PROXY,
        proxy_value_preview: process.env.SOCKS_PROXY ? process.env.SOCKS_PROXY.substring(0, 10) + "..." : "N/A"
    }, { status: 503 });
  }
}

export async function POST(request) {
  const socksProxy = process.env.SOCKS_PROXY || (process.env.NODE_ENV === "development" ? "socks://localhost:1080" : null);

  if (!socksProxy) {
    return NextResponse.json(
      {
        error: "Missing SOCKS_PROXY",
        message: "SOCKS_PROXY env var is not set",
      },
      { status: 500 }
    );
  }

  // Restore session cookies from bot_auth_data
  const botAuthCookie = request.cookies.get("bot_auth_data");
  let cookieHeader = "";

  if (botAuthCookie?.value) {
    try {
      cookieHeader = Buffer.from(botAuthCookie.value, "base64").toString("utf-8");
    } catch (e) {
      console.error("[Proxy] Failed to decode bot_auth_data cookie:", e.message);
    }
  }

  // Get content type and body
  const contentType = request.headers.get("content-type") || "application/x-www-form-urlencoded";
  const body = await request.text();

  const config = {
    method: "POST",
    url: "https://justapedia.org/api.php",
    data: body,
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": contentType,
      "Accept": "application/json",
      Cookie: cookieHeader,
    },
  };

  try {
    const result = await makeRequest(config);
    
    return NextResponse.json(result.data, { 
        status: result.status,
        headers: {
            "Content-Type": "application/json"
        }
    });
  } catch (e) {
    console.error("Proxy POST Request Error:", e);
    return NextResponse.json({
        error: "Proxy connection failed",
        message: e.message,
        hint: "Check SOCKS_PROXY availability and upstream connection.",
        proxy_configured: !!process.env.SOCKS_PROXY,
    }, { status: 503 });
  }
}
