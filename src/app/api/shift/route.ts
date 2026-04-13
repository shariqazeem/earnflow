import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/shift?token=USDC&currentApy=4.2&currentProtocol=aave-v3&currentChainId=42161
 *
 * Finds better yield opportunities for the user's current position.
 * Returns shift recommendations: higher APY vaults on any chain.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.toUpperCase();
  const currentApy = parseFloat(req.nextUrl.searchParams.get("currentApy") ?? "0");
  const currentProtocol = req.nextUrl.searchParams.get("currentProtocol") ?? "";
  const currentChainId = parseInt(req.nextUrl.searchParams.get("currentChainId") ?? "0");

  if (!token || !currentApy) {
    return NextResponse.json({ error: "token and currentApy required" }, { status: 400 });
  }

  try {
    // Fetch all vaults
    const allVaults: VaultData[] = [];
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

    const TRUSTED_PROTOCOLS = [
      "aave-v3", "aave", "morpho", "morpho-v1", "morpho-v2",
      "compound-v3", "compound", "euler-v2", "lido", "spark",
      "maker", "yearn", "beefy", "stargate", "venus",
    ];
    const ESTABLISHED_CHAINS = [1, 42161, 10, 8453, 137, 56, 43114, 100, 534352, 59144];

    // Find better vaults for the same token
    const betterVaults = allVaults
      .filter((v) => {
        if (!v.isTransactional) return false;
        if (!ESTABLISHED_CHAINS.includes(v.chainId)) return false;

        const symbols = v.underlyingTokens?.map((t) => t.symbol.toUpperCase()) ?? [];
        const searchSet = new Set([token]);
        if (token === "ETH") searchSet.add("WETH");
        if (token === "WETH") searchSet.add("ETH");
        const matchesToken = symbols.some((s) => searchSet.has(s));
        if (!matchesToken) return false;

        const apy = v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0;
        const tvl = parseFloat(v.analytics?.tvl?.usd || "0");

        // Must be meaningfully better (at least 0.5% more APY)
        if (apy <= currentApy + 0.5) return false;
        if (tvl < 1_000_000) return false;
        if (apy > 30) return false;

        // Skip same vault on same chain with same protocol
        if (v.protocol.name.toLowerCase() === currentProtocol.toLowerCase() && v.chainId === currentChainId) return false;

        // ONLY trusted protocols that actually work with Composer
        const proto = v.protocol.name.toLowerCase();
        const isTrusted = TRUSTED_PROTOCOLS.some((p) => proto.includes(p));
        if (!isTrusted) return false;

        return true;
      })
      .sort((a, b) => {
        const apyA = a.analytics?.apy?.total ?? a.analytics?.apy7d ?? 0;
        const apyB = b.analytics?.apy?.total ?? b.analytics?.apy7d ?? 0;
        const tvlA = parseFloat(a.analytics?.tvl?.usd || "0");
        const tvlB = parseFloat(b.analytics?.tvl?.usd || "0");
        const trustA = TRUSTED_PROTOCOLS.includes(a.protocol.name.toLowerCase()) ? 2 : 0;
        const trustB = TRUSTED_PROTOCOLS.includes(b.protocol.name.toLowerCase()) ? 2 : 0;
        const scoreA = apyA + trustA + Math.log10(Math.max(tvlA, 1)) * 0.3;
        const scoreB = apyB + trustB + Math.log10(Math.max(tvlB, 1)) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 3);

    if (betterVaults.length === 0) {
      return NextResponse.json({ shifts: [], message: "You're already in the best vault!" });
    }

    const shifts = betterVaults.map((v) => {
      const apy = v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0;
      const tvl = parseFloat(v.analytics?.tvl?.usd || "0");
      const isTrusted = TRUSTED_PROTOCOLS.includes(v.protocol.name.toLowerCase());

      let safetyScore = 3;
      if (isTrusted) safetyScore += 1;
      if (tvl > 100_000_000) safetyScore += 1;
      else if (tvl < 5_000_000) safetyScore -= 1;
      if (apy > 15) safetyScore -= 1;
      safetyScore = Math.max(1, Math.min(5, safetyScore));

      const safetyLabels: Record<number, string> = {
        1: "High Risk", 2: "Moderate Risk", 3: "Standard",
        4: "Well Established", 5: "Battle Tested",
      };

      return {
        vault: {
          name: v.name,
          address: v.address,
          chainId: v.chainId,
          network: v.network,
          protocol: v.protocol.name,
          apy,
          tvl: v.analytics?.tvl?.usd,
          token: v.underlyingTokens?.[0] ?? null,
          safety: {
            score: safetyScore,
            label: safetyLabels[safetyScore],
            trusted: isTrusted,
            tvlFormatted:
              tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(1)}B` :
              tvl >= 1e6 ? `$${(tvl / 1e6).toFixed(0)}M` :
              `$${(tvl / 1e3).toFixed(0)}K`,
          },
        },
        improvement: {
          fromApy: currentApy,
          toApy: apy,
          delta: apy - currentApy,
          extraYearlyPer1000: ((apy - currentApy) / 100) * 1000,
        },
      };
    });

    return NextResponse.json({ shifts }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Shift API error:", error);
    return NextResponse.json({ error: "Failed to find shift opportunities" }, { status: 500 });
  }
}

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
};
