import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const res = await fetch(`https://earn.li.fi/v1/earn/portfolio/${address}/positions`);
  if (!res.ok) {
    if (res.status === 404) return NextResponse.json({ data: [] });
    return NextResponse.json({ error: "Failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
