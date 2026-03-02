import { NextResponse } from "next/server";
import { makeRequest, mergeCookies } from "../../../../utils/proxyRequest";

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 },
      );
    }

    let currentCookies = "";
    
    // Pass headers from the client request to look more like a real browser
    const commonHeaders = {};
    const headersToForward = [
        "user-agent",
        "accept-language",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform"
    ];

    headersToForward.forEach(header => {
        const value = request.headers.get(header);
        if (value) {
            commonHeaders[header] = value;
        }
    });

    // Step 1: Get login token
    console.log("[Login] Step 1: Getting login token...");
    const tokenRes = await makeRequest({
      method: "GET",
      url: "https://justapedia.org/api.php",
      params: {
        action: "query",
        meta: "tokens",
        type: "login",
        format: "json",
      },
      headers: commonHeaders,
    });

    // Handle upstream errors (e.g. 403 Cloudflare, 502 Bad Gateway)
    if (tokenRes.status !== 200) {
        console.error("[Login] Token request failed with status:", tokenRes.status);
        
        // If upstream returned HTML (Cloudflare block), return a clean JSON error
        const isHtml = typeof tokenRes.data === 'string' && tokenRes.data.trim().startsWith('<');
        if (isHtml || tokenRes.status === 403) {
            return NextResponse.json({
                error: "Upstream Blocked",
                message: "The Justapedia API blocked the request (likely Cloudflare). Try using a different Proxy.",
                status: tokenRes.status
            }, { status: tokenRes.status });
        }

        return NextResponse.json(tokenRes.data, { status: tokenRes.status });
    }

    // Update cookies from token response
    if (tokenRes.cookies && tokenRes.cookies.length > 0) {
        currentCookies = mergeCookies(currentCookies, tokenRes.cookies);
    }

    const loginToken = tokenRes.data?.query?.tokens?.logintoken;

    if (!loginToken) {
      console.error("[Login] Failed to get login token", tokenRes.data);
      return NextResponse.json(
        { error: "Failed to get login token", upstream_response: tokenRes.data },
        { status: 502 }, // Bad Gateway (upstream response invalid)
      );
    }

    // Step 2: Perform login
    console.log("[Login] Step 2: Logging in...");
    const loginRes = await makeRequest({
      method: "POST",
      url: "https://justapedia.org/api.php",
      data: new URLSearchParams({
        action: "login",
        lgname: username,
        lgpassword: password,
        lgtoken: loginToken,
        format: "json",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: currentCookies,
        ...commonHeaders,
      },
    });

    if (loginRes.status !== 200) {
         console.error("[Login] Login request failed with status:", loginRes.status);
         return NextResponse.json(loginRes.data, { status: loginRes.status });
    }

    // Update cookies from login response
    if (loginRes.cookies && loginRes.cookies.length > 0) {
        currentCookies = mergeCookies(currentCookies, loginRes.cookies);
    }

    const loginResult = loginRes.data?.login?.result;

    if (loginResult === "Success") {
      console.log("[Login] Login successful!");
      
      // Encode cookies to base64 for client storage
      const encodedCookies = Buffer.from(currentCookies).toString("base64");

      const response = NextResponse.json({
        status: "success",
        user: {
            username: loginRes.data?.login?.lgusername
        }
      });

      response.cookies.set("bot_auth_data", encodedCookies, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return response;
    } else {
      console.error("[Login] Login failed:", loginRes.data);
      return NextResponse.json(
        { 
            error: "Login failed", 
            details: loginRes.data?.login?.reason || loginResult 
        },
        { status: 401 },
      );
    }

  } catch (error) {
    const msg = error && error.message ? error.message : "Unknown error";
    console.error("[Login] Error:", msg);
    if (msg.includes("Proxy connection failed")) {
      return NextResponse.json(
        {
          error: "Proxy connection failed",
          message: msg,
          hint:
            "Configure SOCKS_PROXY or ensure the local proxy is running. See .env.example.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Login error", message: msg },
      { status: 502 },
    );
  }
}
