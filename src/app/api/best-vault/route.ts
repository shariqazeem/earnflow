import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/best-vault?token=USDC
 *
 * Finds the single best yield vault for a given token across all chains.
 * Returns vault info + the optimal deposit route.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.toUpperCase();
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  try {
    // Fetch all vaults
    const allVaults = [];
    let cursor: string | undefined;

    for (let page = 0; page < 5; page++) {
      const url = new URL("https://earn.li.fi/v1/earn/vaults");
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const json = await res.json();
      allVaults.push(...(json.data ?? []));
      cursor = json.nextCursor;
      if (!cursor || (json.data?.length ?? 0) < 100) break;
    }

    // Filter by token
    type VaultData = {
      name: string;
      slug: string;
      address: string;
      chainId: number;
      network: string;
      protocol: { name: string; url: string };
      description: string;
      analytics: {
        apy: { total: number | null; base: number | null; reward: number | null };
        tvl: { usd: string };
        apy7d: number | null;
      };
      underlyingTokens: { symbol: string; address: string; decimals: number }[];
      isTransactional: boolean;
      depositPacks?: { name: string }[];
    };

    const matching = (allVaults as VaultData[]).filter((v) => {
      const symbols = v.underlyingTokens?.map((t) => t.symbol.toUpperCase()) ?? [];
      return symbols.some((s) => s.includes(token)) || v.name.toUpperCase().includes(token);
    });

    // Sort by APY (total → 7d fallback) and filter for transactional vaults with decent TVL
    const ranked = matching
      .filter((v) => v.isTransactional && parseFloat(v.analytics?.tvl?.usd || "0") > 50000)
      .sort((a, b) => {
        const apyA = a.analytics?.apy?.total ?? a.analytics?.apy7d ?? 0;
        const apyB = b.analytics?.apy?.total ?? b.analytics?.apy7d ?? 0;
        return apyB - apyA;
      });

    if (ranked.length === 0) {
      return NextResponse.json({ error: "No vaults found for this token" }, { status: 404 });
    }

    const best = ranked[0];
    const apy = best.analytics?.apy?.total ?? best.analytics?.apy7d ?? 0;
    const underlyingToken = best.underlyingTokens?.[0];

    return NextResponse.json({
      vault: {
        name: best.name,
        slug: best.slug,
        address: best.address,
        chainId: best.chainId,
        network: best.network,
        protocol: best.protocol.name,
        protocolUrl: best.protocol.url,
        description: best.description,
        apy,
        tvl: best.analytics?.tvl?.usd,
        token: underlyingToken
          ? {
              symbol: underlyingToken.symbol,
              address: underlyingToken.address,
              decimals: underlyingToken.decimals,
            }
          : null,
      },
      alternatives: ranked.slice(1, 4).map((v) => ({
        name: v.name,
        slug: v.slug,
        address: v.address,
        chainId: v.chainId,
        network: v.network,
        protocol: v.protocol.name,
        apy: v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0,
        tvl: v.analytics?.tvl?.usd,
      })),
      totalScanned: allVaults.length,
    }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Best vault error:", error);
    return NextResponse.json({ error: "Failed to find vaults" }, { status: 500 });
  }
}
