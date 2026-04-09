import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/status?txHash=0x...&fromChain=1&toChain=8453
 *
 * Tracks cross-chain transaction status via LI.FI.
 */
export async function GET(req: NextRequest) {
  const txHash = req.nextUrl.searchParams.get("txHash");
  const fromChain = req.nextUrl.searchParams.get("fromChain");
  const toChain = req.nextUrl.searchParams.get("toChain");

  if (!txHash) {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  const url = new URL("https://li.quest/v1/status");
  url.searchParams.set("txHash", txHash);
  if (fromChain) url.searchParams.set("fromChain", fromChain);
  if (toChain) url.searchParams.set("toChain", toChain);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Status check failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
