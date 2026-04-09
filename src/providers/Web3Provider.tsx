"use client";

import { createConfig, http, WagmiProvider } from "wagmi";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  avalanche,
} from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, arbitrum, optimism, base, polygon, bsc, avalanche],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http("https://eth.llamarpc.com"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
    [optimism.id]: http("https://mainnet.optimism.io"),
    [base.id]: http("https://mainnet.base.org"),
    [polygon.id]: http("https://polygon-rpc.com"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
    [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
