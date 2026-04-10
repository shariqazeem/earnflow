"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts, useBalance } from "wagmi";
import { erc20Abi, formatUnits } from "viem";

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string; // 0x0...0 for native ETH
  decimals: number;
  balance: string; // human-readable
  balanceRaw: bigint;
  icon: string;
}

// Major token addresses per chain
const TOKEN_MAP: Record<number, { symbol: string; name: string; address: `0x${string}`; decimals: number; icon: string }[]> = {
  // Ethereum
  1: [
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, icon: "💵" },
    { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, icon: "💲" },
    { symbol: "DAI", name: "Dai", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, icon: "◈" },
    { symbol: "WETH", name: "Wrapped ETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, icon: "◆" },
  ],
  // Arbitrum
  42161: [
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, icon: "💵" },
    { symbol: "USDT", name: "Tether", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, icon: "💲" },
    { symbol: "DAI", name: "Dai", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, icon: "◈" },
  ],
  // Base
  8453: [
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, icon: "💵" },
    { symbol: "DAI", name: "Dai", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18, icon: "◈" },
  ],
  // Optimism
  10: [
    { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, icon: "💵" },
    { symbol: "USDT", name: "Tether", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6, icon: "💲" },
    { symbol: "DAI", name: "Dai", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, icon: "◈" },
  ],
  // Polygon
  137: [
    { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, icon: "💵" },
    { symbol: "USDT", name: "Tether", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, icon: "💲" },
    { symbol: "DAI", name: "Dai", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18, icon: "◈" },
  ],
};

export function useTokenBalances() {
  const { address, chainId } = useAccount();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Native ETH balance
  const nativeBalance = useBalance({ address });

  // Get ERC20 tokens for the connected chain
  const chainTokens = chainId ? TOKEN_MAP[chainId] ?? TOKEN_MAP[1] : TOKEN_MAP[1];

  // Build contract reads for all ERC20 tokens
  const contracts = address
    ? chainTokens.map((t) => ({
        address: t.address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      }))
    : [];

  const { data: balanceResults, isLoading: isReadingBalances } = useReadContracts({
    contracts,
  });

  useEffect(() => {
    if (!address) {
      setTokens([]);
      setIsLoading(false);
      return;
    }

    const result: TokenInfo[] = [];

    // Add native ETH
    if (nativeBalance.data) {
      const ethBal = nativeBalance.data.value;
      result.push({
        symbol: "ETH",
        name: "Ethereum",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        balance: formatUnits(ethBal, 18),
        balanceRaw: ethBal,
        icon: "◆",
      });
    }

    // Add ERC20 tokens
    if (balanceResults) {
      chainTokens.forEach((token, i) => {
        const res = balanceResults[i];
        if (res.status === "success") {
          const raw = res.result as bigint;
          result.push({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            balance: formatUnits(raw, token.decimals),
            balanceRaw: raw,
            icon: token.icon,
          });
        }
      });
    }

    setTokens(result);
    setIsLoading(isReadingBalances || nativeBalance.isLoading);
  }, [address, balanceResults, nativeBalance.data, nativeBalance.isLoading, isReadingBalances, chainTokens]);

  return {
    tokens,
    isLoading,
    chainId: chainId ?? 1,
    chainName: getChainName(chainId ?? 1),
  };
}

function getChainName(id: number): string {
  const names: Record<number, string> = {
    1: "Ethereum",
    42161: "Arbitrum",
    10: "Optimism",
    8453: "Base",
    137: "Polygon",
    56: "BSC",
    43114: "Avalanche",
    84532: "Base Sepolia",
    11155111: "Sepolia",
    421614: "Arb Sepolia",
    11155420: "OP Sepolia",
    80002: "Polygon Amoy",
  };
  return names[id] ?? `Chain ${id}`;
}
