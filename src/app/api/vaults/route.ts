import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "100";
  const cursor = req.nextUrl.searchParams.get("cursor");

  const url = new URL("https://earn.li.fi/v1/earn/vaults");
  url.searchParams.set("limit", limit);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch vaults" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
