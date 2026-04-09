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

    // Safety-first ranking:
    // - Must be transactional
    // - TVL > $1M (real liquidity = real safety)
    // - APY between 0.5% and 30% (sustainable range)
    // - Known protocols preferred
    const TRUSTED_PROTOCOLS = ["aave-v3", "morpho", "morpho-v1", "morpho-v2", "compound-v3", "euler-v2", "maple", "lido", "spark", "maker"];

    const ranked = matching
      .filter((v) => {
        if (!v.isTransactional) return false;
        const tvl = parseFloat(v.analytics?.tvl?.usd || "0");
        const apy = v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0;
        if (tvl < 1_000_000) return false;    // Min $1M TVL
        if (apy > 30) return false;            // Cap at 30% (anything higher is risky)
        if (apy < 0.5) return false;           // Min 0.5% APY
        return true;
      })
      .sort((a, b) => {
        const apyA = a.analytics?.apy?.total ?? a.analytics?.apy7d ?? 0;
        const apyB = b.analytics?.apy?.total ?? b.analytics?.apy7d ?? 0;
        const tvlA = parseFloat(a.analytics?.tvl?.usd || "0");
        const tvlB = parseFloat(b.analytics?.tvl?.usd || "0");
        // Trusted protocol bonus
        const trustA = TRUSTED_PROTOCOLS.includes(a.protocol.name.toLowerCase()) ? 2 : 0;
        const trustB = TRUSTED_PROTOCOLS.includes(b.protocol.name.toLowerCase()) ? 2 : 0;
        // Score: APY + trust bonus + TVL weight
        const scoreA = apyA + trustA + Math.log10(Math.max(tvlA, 1)) * 0.3;
        const scoreB = apyB + trustB + Math.log10(Math.max(tvlB, 1)) * 0.3;
        return scoreB - scoreA;
      });

    if (ranked.length === 0) {
      return NextResponse.json({ error: "No vaults found for this token" }, { status: 404 });
    }

    const best = ranked[0];
    const apy = best.analytics?.apy?.total ?? best.analytics?.apy7d ?? 0;
    const underlyingToken = best.underlyingTokens?.[0];

    const tvl = parseFloat(best.analytics?.tvl?.usd || "0");
    const isTrusted = TRUSTED_PROTOCOLS.includes(best.protocol.name.toLowerCase());

    // Safety score: 1-5
    let safetyScore = 3;
    if (isTrusted) safetyScore += 1;
    if (tvl > 100_000_000) safetyScore += 1;    // $100M+ TVL
    else if (tvl < 5_000_000) safetyScore -= 1;  // < $5M TVL
    if (apy > 15) safetyScore -= 1;               // High APY = more risk
    safetyScore = Math.max(1, Math.min(5, safetyScore));

    const safetyLabels: Record<number, string> = {
      1: "High Risk",
      2: "Moderate Risk",
      3: "Standard",
      4: "Well Established",
      5: "Battle Tested",
    };

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
        safety: {
          score: safetyScore,
          label: safetyLabels[safetyScore],
          trusted: isTrusted,
          tvlFormatted: tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(1)}B` : tvl >= 1e6 ? `$${(tvl / 1e6).toFixed(0)}M` : `$${(tvl / 1e3).toFixed(0)}K`,
        },
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
