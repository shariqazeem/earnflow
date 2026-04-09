// Earn API proxied through our /api routes to avoid CORS
const EARN_PROXY = "/api";
const EARN_DIRECT = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";

function getComposerKey(): string {
  return process.env.NEXT_PUBLIC_LIFI_API_KEY ?? "";
}

// ── Types matching actual LI.FI API ──

export interface Vault {
  name: string;
  slug: string;
  address: string;
  chainId: number;
  network: string;
  tags: string[];
  protocol: {
    name: string;
    url: string;
  };
  analytics: {
    apy: {
      base: number | null;
      total: number | null;
      reward: number | null;
    };
    tvl: {
      usd: string;
    };
    apy1d: number | null;
    apy7d: number | null;
    apy30d: number | null;
  };
  description: string;
  underlyingTokens: {
    symbol: string;
    address: string;
    decimals: number;
  }[];
  isTransactional: boolean;
  isRedeemable: boolean;
  depositPacks?: { name: string; stepsType: string }[];
  redeemPacks?: { name: string; stepsType: string }[];
}

// ── Earn Data API ──

export async function fetchAllVaults(): Promise<Vault[]> {
  const all: Vault[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${EARN_PROXY}/vaults?${params}`);
    if (!res.ok) break;
    const json = await res.json();
    const vaults = json.data ?? [];
    all.push(...vaults);
    cursor = json.nextCursor;
    if (!cursor || vaults.length < 100) break;
  }

  return all;
}

export async function getVaultsPage(
  limit = 100,
  cursor?: string
): Promise<{ vaults: Vault[]; nextCursor?: string; total: number }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${EARN_PROXY}/vaults?${params}`);
  if (!res.ok) throw new Error(`Earn API error: ${res.status}`);
  const json = await res.json();
  return {
    vaults: json.data ?? [],
    nextCursor: json.nextCursor,
    total: json.total ?? 0,
  };
}

export async function getChains() {
  // This is a rare call, use direct (server-side only) or proxy
  const res = await fetch(`${EARN_DIRECT}/v1/earn/chains`);
  if (!res.ok) throw new Error(`Chains API error: ${res.status}`);
  return res.json();
}

export async function getPositions(address: string) {
  const res = await fetch(`${EARN_PROXY}/positions?address=${address}`);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Positions API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json ?? [];
}

// ── Composer API ──

export async function getComposerQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}) {
  const url = new URL(`${COMPOSER_BASE}/v1/quote`);
  url.searchParams.set("fromChain", String(params.fromChain));
  url.searchParams.set("toChain", String(params.toChain));
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAmount", params.fromAmount);
  url.searchParams.set("fromAddress", params.fromAddress);

  const res = await fetch(url.toString(), {
    headers: { "x-lifi-api-key": getComposerKey() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Composer error: ${res.status}`
    );
  }
  return res.json();
}

// ── Helpers ──

export function getVaultApy(vault: Vault): number {
  return vault.analytics?.apy?.total ?? vault.analytics?.apy7d ?? 0;
}

export function formatApy(apy: number | null | undefined): string {
  if (apy === null || apy === undefined || apy === 0) return "—";
  return `${apy.toFixed(2)}%`;
}

export function formatTvl(tvl: string | number | undefined): string {
  if (!tvl) return "$0";
  const num = typeof tvl === "string" ? parseFloat(tvl) : tvl;
  if (isNaN(num)) return "$0";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export function getVaultToken(vault: Vault): string {
  return vault.underlyingTokens?.[0]?.symbol ?? vault.name ?? "???";
}

export function searchVaults(vaults: Vault[], query: string): Vault[] {
  if (!query.trim()) return vaults;
  const q = query.trim().toUpperCase();
  return vaults.filter((v) => {
    // Match underlying token symbols
    const matchesToken = v.underlyingTokens?.some((t) =>
      t.symbol.toUpperCase().includes(q)
    );
    // Match vault name
    const matchesName = v.name.toUpperCase().includes(q);
    // Match tags
    const matchesTag = v.tags?.some((t) => t.toUpperCase().includes(q));
    // Match protocol
    const matchesProtocol = v.protocol?.name?.toUpperCase().includes(q);
    // Match network/chain
    const matchesChain = v.network?.toUpperCase().includes(q);
    return matchesToken || matchesName || matchesTag || matchesProtocol || matchesChain;
  });
}

// Chain logo mapping
export const CHAIN_LOGOS: Record<string, string> = {
  Ethereum: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg",
  Arbitrum: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg",
  Optimism: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg",
  Base: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg",
  Polygon: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg",
  BSC: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg",
  Avalanche: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/avalanche.svg",
};
