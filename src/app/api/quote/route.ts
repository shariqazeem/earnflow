import { NextRequest, NextResponse } from "next/server";

const LIFI_API_KEY = process.env.LIFI_API_KEY ?? process.env.NEXT_PUBLIC_LIFI_API_KEY ?? "";

/**
 * GET /api/quote?fromChain=1&toChain=8453&fromToken=0x...&toToken=0x...&fromAmount=1000000&fromAddress=0x...
 *
 * Proxies the LI.FI Composer /v1/quote endpoint.
 * Returns a ready-to-sign transaction for cross-chain deposit.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const required = ["fromChain", "toChain", "fromToken", "toToken", "fromAmount", "fromAddress"];
  for (const key of required) {
    if (!params.get(key)) {
      return NextResponse.json({ error: `Missing: ${key}` }, { status: 400 });
    }
  }

  try {
    const url = new URL("https://li.quest/v1/quote");
    // Forward all params
    params.forEach((value, key) => url.searchParams.set(key, value));
    // Set integrator for fee collection
    url.searchParams.set("integrator", "earnflow");

    const headers: Record<string, string> = {};
    if (LIFI_API_KEY) {
      headers["x-lifi-api-key"] = LIFI_API_KEY;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Quote failed" }));
      return NextResponse.json(
        { error: (err as { message?: string }).message ?? `Composer error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Quote proxy error:", error);
    return NextResponse.json({ error: "Failed to get quote" }, { status: 500 });
  }
}
