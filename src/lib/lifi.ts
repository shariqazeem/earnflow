const EARN_BASE = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";

// Composer API key — set via env or hardcode for hackathon
function getComposerKey(): string {
  return process.env.NEXT_PUBLIC_LIFI_API_KEY ?? "";
}

// ── Earn Data API (no auth) ──

export interface Vault {
  id: string;
  name: string;
  apy: number | null;
  apy7d: number | null;
  tvl: string;
  chain: string;
  chainId: number;
  protocol: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  };
  depositToken?: {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  };
  rewardTokens?: {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }[];
}

export interface Chain {
  id: number;
  name: string;
  logoURI?: string;
}

export interface Position {
  vault: Vault;
  balance: string;
  balanceUsd: number;
  earnings: string;
  earningsUsd: number;
}

export async function getVaults(params?: {
  chainId?: number;
  token?: string;
  protocol?: string;
  limit?: number;
  offset?: number;
}): Promise<Vault[]> {
  const url = new URL(`${EARN_BASE}/v1/earn/vaults`);
  if (params?.chainId) url.searchParams.set("chainId", String(params.chainId));
  if (params?.token) url.searchParams.set("token", params.token);
  if (params?.protocol) url.searchParams.set("protocol", params.protocol);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Earn API error: ${res.status}`);
  const data = await res.json();
  return data.vaults ?? data ?? [];
}

export async function getChains(): Promise<Chain[]> {
  const res = await fetch(`${EARN_BASE}/v1/earn/chains`);
  if (!res.ok) throw new Error(`Chains API error: ${res.status}`);
  const data = await res.json();
  return data.chains ?? data ?? [];
}

export async function getPositions(address: string): Promise<Position[]> {
  const res = await fetch(
    `${EARN_BASE}/v1/earn/portfolio/${address}/positions`
  );
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Positions API error: ${res.status}`);
  }
  const data = await res.json();
  return data.positions ?? data ?? [];
}

// ── Composer API (requires API key) ──

export interface ComposerQuote {
  id: string;
  type: string;
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    chainId: number;
  };
  estimate?: {
    fromAmount: string;
    toAmount: string;
    approvalAddress?: string;
    executionDuration?: number;
    gasCosts?: { amountUSD: string }[];
  };
  action?: {
    fromChainId: number;
    toChainId: number;
    fromToken: { symbol: string; address: string };
    toToken: { symbol: string; address: string };
  };
  includedSteps?: {
    type: string;
    tool: string;
    estimate?: {
      fromAmount: string;
      toAmount: string;
    };
    action?: {
      fromChainId: number;
      toChainId: number;
    };
  }[];
}

export async function getComposerQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string; // vault address for deposits
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
}): Promise<ComposerQuote> {
  const url = new URL(`${COMPOSER_BASE}/v1/quote`);
  url.searchParams.set("fromChain", String(params.fromChain));
  url.searchParams.set("toChain", String(params.toChain));
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAmount", params.fromAmount);
  url.searchParams.set("fromAddress", params.fromAddress);
  if (params.toAddress) url.searchParams.set("toAddress", params.toAddress);

  const res = await fetch(url.toString(), {
    headers: {
      "x-lifi-api-key": getComposerKey(),
    },
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

export function formatApy(apy: number | null): string {
  if (apy === null || apy === undefined) return "—";
  return `${(apy * 100).toFixed(1)}%`;
}

export function formatTvl(tvl: string | number): string {
  const num = typeof tvl === "string" ? parseFloat(tvl) : tvl;
  if (isNaN(num)) return "$0";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

// Common chain IDs
export const CHAINS = {
  ETHEREUM: 1,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  POLYGON: 137,
  BSC: 56,
  AVALANCHE: 43114,
} as const;

// Common token addresses (Ethereum)
export const TOKENS = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  ETH: "0x0000000000000000000000000000000000000000",
} as const;
