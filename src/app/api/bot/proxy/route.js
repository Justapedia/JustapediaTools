import { NextResponse } from "next/server";
import { getJustapediaConfig } from "../../../../config/justapedia";
import { makeRequest, buildApiHeaders } from "../../../../utils/justapediaRequest";

async function forwardRequest(request, method) {
  const config = getJustapediaConfig();
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const apiConfig = {
    method,
    url: config.apiUrl,
    headers: buildApiHeaders({
      Origin: config.wikiOrigin,
      Referer: `${config.wikiOrigin}/`,
    }),
    params: Object.fromEntries(searchParams),
  };

  if (method === "POST") {
    const contentType =
      request.headers.get("content-type") || "application/x-www-form-urlencoded";
    apiConfig.headers["Content-Type"] = contentType;
    apiConfig.data = await request.text();
  }

  try {
    const result = await makeRequest(apiConfig);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Bot API request error:", error.message);
    return NextResponse.json(
      { error: "Bot API request failed", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  return forwardRequest(request, "GET");
}

export async function POST(request) {
  return forwardRequest(request, "POST");
}
