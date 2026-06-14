import { NextResponse } from "next/server";
import { getJustapediaConfig } from "../../../config/justapedia";
import { makeRequest, buildApiHeaders } from "../../../utils/justapediaRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const config = getJustapediaConfig();

  const apiConfig = {
    method: "GET",
    url: config.apiUrl,
    params: Object.fromEntries(searchParams),
    headers: buildApiHeaders(),
  };

  try {
    const result = await makeRequest(apiConfig);

    return NextResponse.json(result.data, {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Justapedia API request error:", e);
    return NextResponse.json(
      {
        error: "Justapedia API request failed",
        message: e.message,
        hint: "Check network connectivity and Justapedia API availability.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request) {
  const config = getJustapediaConfig();
  const contentType =
    request.headers.get("content-type") || "application/x-www-form-urlencoded";
  const body = await request.text();

  const apiConfig = {
    method: "POST",
    url: config.apiUrl,
    data: body,
    headers: buildApiHeaders({
      "Content-Type": contentType,
    }),
  };

  try {
    const result = await makeRequest(apiConfig);

    return NextResponse.json(result.data, {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Justapedia API POST request error:", e);
    return NextResponse.json(
      {
        error: "Justapedia API request failed",
        message: e.message,
        hint: "Check network connectivity and Justapedia API availability.",
      },
      { status: 503 },
    );
  }
}
