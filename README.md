# Shift — Your Savings, Supercharged

A DeFi savings account that makes earning yield as simple as a bank deposit. Built for the [DeFi Mullet Hackathon](https://docs.li.fi/earn/overview) (DeFi UX Challenge track).

**Live:** [earnflow-app.vercel.app](https://earnflow-app.vercel.app)

## What it does

Shift turns complex DeFi yield into a one-tap savings experience:

1. **Connect wallet** — MetaMask, Coinbase, Rainbow, or any injected wallet
2. **Pick a token** — see your balances across Ethereum, Arbitrum, Base, Optimism, Polygon
3. **One tap deposit** — we find the best vault (safety-scored) across 20+ protocols and 60+ chains, then deposit via LI.FI Composer in a single cross-chain transaction
4. **Watch it grow** — real-time earning counter with live yield projections
5. **Shift to better rates** — when a higher-yield vault appears, migrate in one tap (cross-chain yield migration)

## How it uses LI.FI

**Earn Data API:**
- Vault discovery across all supported protocols and chains
- Real-time APY, TVL, and protocol metadata
- Portfolio position tracking
- Safety scoring based on protocol trust + TVL + APY sustainability

**Composer API:**
- Cross-chain deposit execution (swap + bridge + deposit in one tx)
- ERC20 approval handling
- Cross-chain transaction status tracking
- Withdrawal execution

**API Routes:**
- `/api/best-vault` — scans all vaults, ranks by composite score (APY + trust + TVL), returns best + alternatives
- `/api/top-yields` — real-time top yields across all chains
- `/api/shift` — finds better yield opportunities for existing positions
- `/api/quote` — LI.FI Composer quote proxy
- `/api/positions` — fetches user's active earning positions
- `/api/status` — tracks cross-chain transaction progress

## Key features

- **Safety scoring** (1-5 scale) based on protocol reputation, TVL, and APY sustainability
- **Cross-chain yield migration ("Shift")** — move funds to better vaults across chains
- **Live yield counter** — real-time earning visualization with milestone celebrations
- **Social proof** — live activity feed and leaderboard
- **Sound design** — synthesized audio feedback for deposits, earnings, and milestones
- **Cinematic UI** — Apple Savings-inspired design with Framer Motion animations

## Tech stack

- **Next.js 16** with Turbopack
- **React 19** + TypeScript
- **Tailwind CSS 4** + Framer Motion
- **wagmi v3** + viem for wallet integration
- **LI.FI Earn API** + Composer for DeFi infrastructure

## Run locally

```bash
npm install
echo "LIFI_API_KEY=your_key" > .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## What I'd build next

- Auto-rebalancing agent that monitors positions and shifts to better rates automatically
- Multi-position portfolio view with aggregate yield tracking
- Push notifications for rate changes and milestone celebrations
- Fiat on-ramp integration for true "savings account" experience

## Feedback on LI.FI Earn API

The Earn Data API is excellent — vault discovery, pagination, and metadata are well-structured. Composer makes cross-chain deposits feel like a single-chain operation. The main friction point was CORS (solved by proxying through Next.js API routes). Having `isTransactional` and `isRedeemable` flags on vaults was very helpful for UX decisions.

---

Built by [@shariqazeem](https://x.com/shariqazeem) for the DeFi Mullet Hackathon.
