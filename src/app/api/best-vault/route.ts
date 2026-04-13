import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/best-vault?token=ETH&chainId=8453
 *
 * Returns top vault candidates for a token — including cross-token options (e.g. USDC vaults for ETH users).
 * NO route verification here (slow). The frontend fetches real quotes in parallel for each candidate.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.toUpperCase();
  const userChainId = parseInt(req.nextUrl.searchParams.get("chainId") ?? "0");

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  try {
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

    const TRUSTED = [
      "aave-v3", "aave", "morpho", "morpho-v1", "morpho-v2",
      "compound-v3", "compound", "euler-v2", "lido", "spark",
      "maker", "yearn", "beefy", "stargate", "venus",
    ];
    const CHAINS = [1, 42161, 10, 8453, 137, 56, 43114];
    const isEthSearch = token === "ETH" || token === "WETH";
    const ethDerivatives = new Set(["ETH", "WETH", "WSTETH", "CBETH", "RSETH", "WRSETH", "RETH", "STETH"]);

    // Find same-token vaults
    const sameTokenVaults = allVaults.filter((v) => {
      const syms = v.underlyingTokens?.map((t) => t.symbol.toUpperCase()) ?? [];
      if (isEthSearch) return syms.some((s) => ethDerivatives.has(s));
      return syms.some((s) => s === token);
    });

    // Find cross-token vaults (USDC/USDT) — for non-stablecoins, Composer can swap+deposit
    const isStable = ["USDC", "USDT", "DAI", "SDAI", "GHO"].includes(token);
    const crossTokenVaults = isStable ? [] : allVaults.filter((v) => {
      const syms = v.underlyingTokens?.map((t) => t.symbol.toUpperCase()) ?? [];
      return syms.includes("USDC") || syms.includes("USDT");
    });

    function rankVaults(vaults: VaultData[], isCrossToken: boolean) {
      return vaults
        .filter((v) => {
          if (!v.isTransactional) return false;
          if (!CHAINS.includes(v.chainId)) return false;
          const tvl = parseFloat(v.analytics?.tvl?.usd || "0");
          const apy = v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0;
          if (tvl < 1_000_000) return false;
          if (apy > 30 || apy < 0.3) return false;
          const proto = v.protocol.name.toLowerCase();
          if (!TRUSTED.some((p) => proto.includes(p))) return false;
          return true;
        })
        .sort((a, b) => {
          const apyA = a.analytics?.apy?.total ?? a.analytics?.apy7d ?? 0;
          const apyB = b.analytics?.apy?.total ?? b.analytics?.apy7d ?? 0;
          const tvlA = parseFloat(a.analytics?.tvl?.usd || "0");
          const tvlB = parseFloat(b.analytics?.tvl?.usd || "0");
          // Same-chain = huge bonus (avoids bridge fees)
          const chainA = userChainId && a.chainId === userChainId ? 20 : 0;
          const chainB = userChainId && b.chainId === userChainId ? 20 : 0;
          const tvlBonusA = tvlA > 100_000_000 ? 4 : tvlA > 50_000_000 ? 3 : tvlA > 10_000_000 ? 1 : 0;
          const tvlBonusB = tvlB > 100_000_000 ? 4 : tvlB > 50_000_000 ? 3 : tvlB > 10_000_000 ? 1 : 0;
          // Cross-token gets slight penalty since it involves a swap
          const crossPenalty = isCrossToken ? -1 : 0;
          const scoreA = chainA + tvlBonusA + apyA + Math.log10(Math.max(tvlA, 1)) * 0.3 + crossPenalty;
          const scoreB = chainB + tvlBonusB + apyB + Math.log10(Math.max(tvlB, 1)) * 0.3 + crossPenalty;
          return scoreB - scoreA;
        });
    }

    const rankedSame = rankVaults(sameTokenVaults, false).slice(0, 4);
    const rankedCross = rankVaults(crossTokenVaults, true).slice(0, 4);

    function toCandidate(v: VaultData, isCrossToken: boolean) {
      const apy = v.analytics?.apy?.total ?? v.analytics?.apy7d ?? 0;
      const tvl = parseFloat(v.analytics?.tvl?.usd || "0");
      const isSameChain = userChainId > 0 && v.chainId === userChainId;
      let safety = 4;
      if (tvl > 100_000_000) safety = 5;
      else if (tvl < 5_000_000) safety = 3;
      if (apy > 15) safety -= 1;
      safety = Math.max(1, Math.min(5, safety));
      const labels: Record<number, string> = { 1: "High Risk", 2: "Moderate Risk", 3: "Standard", 4: "Well Established", 5: "Battle Tested" };

      return {
        name: v.name,
        address: v.address,
        chainId: v.chainId,
        network: v.network,
        protocol: v.protocol.name,
        apy,
        tvl: v.analytics?.tvl?.usd,
        isSameChain,
        isCrossToken,
        underlyingToken: v.underlyingTokens?.[0]?.symbol ?? "",
        token: v.underlyingTokens?.[0]
          ? { symbol: v.underlyingTokens[0].symbol, address: v.underlyingTokens[0].address, decimals: v.underlyingTokens[0].decimals }
          : null,
        safety: {
          score: safety,
          label: labels[safety],
          trusted: true,
          tvlFormatted: tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(1)}B` : tvl >= 1e6 ? `$${(tvl / 1e6).toFixed(0)}M` : `$${(tvl / 1e3).toFixed(0)}K`,
        },
      };
    }

    // Deduplicate by address
    const seen = new Set<string>();
    const candidates = [...rankedSame, ...rankedCross]
      .map((v) => {
        if (seen.has(v.address)) return null;
        seen.add(v.address);
        return toCandidate(v, !rankedSame.includes(v));
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .slice(0, 8);

    // Best = first candidate (highest score)
    const best = candidates[0] ?? null;

    return NextResponse.json({
      vault: best,
      alternatives: candidates.slice(1, 4),
      candidates, // Full list for quote-first flow
      totalScanned: allVaults.length,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Best vault error:", error);
    return NextResponse.json({ error: "Failed to find vaults" }, { status: 500 });
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
  depositPacks?: { name: string }[];
};
