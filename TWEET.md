# FINAL TWEET — Single long post (Twitter Premium)
# Schedule for: April 14, 6:00 PM PKT (9:00 AM ET)
# Attach: Demo video

I just built Shift with @lifiprotocol Earn — and it changes how DeFi yield works.

The problem: earning yield in DeFi is broken. You pick a chain, find a protocol, check APYs, approve tokens, bridge if needed, deposit, pray it works. Most people give up before step 2.

Shift makes it feel like opening a savings account.

Here's what I built in 7 days:

You connect your wallet. You pick a token — say ETH on Base. You enter an amount.

Then the magic happens.

Shift fires parallel quotes to 8+ vaults across multiple protocols and chains. Not just ETH vaults — USDC vaults too. Because if you have ETH but a USDC vault pays 4.7% vs ETH's 1.7%, why wouldn't you take it?

LI.FI Composer handles the swap + deposit in a single transaction. Your ETH becomes USDC and lands in a Morpho vault. One tap. Same chain. $0.02 in fees.

Every option you see has a REAL quote. You see exactly how much you'll receive, exact fees, and a safety score before you deposit. No failed transactions. No surprises.

This is the quote-first architecture — the opposite of how every other yield app works. They show you a vault and hope the route exists. We prove the route exists first, then show you the vault.

What's under the hood:

- LI.FI Earn Data API — vault discovery across 20+ protocols (Aave, Morpho, Compound, Euler, Lido, and more), with APY, TVL, and protocol metadata
- LI.FI Composer — cross-chain + cross-token deposit execution. Swap + bridge + vault deposit in one transaction
- LI.FI Positions API — on-chain portfolio tracking that works on any device (your savings follow your wallet, not your browser)
- LI.FI Status API — real-time cross-chain transaction monitoring

Features:

- Swipeable yield cards with live Composer quotes
- Cross-token optimization (ETH → USDC vault via auto-swap)
- Safety scoring (1-5) based on protocol trust + TVL + APY sustainability
- Same-chain preference with fee warnings for cross-chain deposits
- Real-time earning counter with milestone celebrations
- Shift detection — finds better rates and migrates cross-chain in one tap
- Auto chain-switching for deposits and withdrawals
- On-chain position tracking that works globally (not localStorage)

The design philosophy: Apple Savings meets DeFi. Every pixel is intentional. Light mode only. Inter font. Soft shadows. 44px touch targets. Spring physics animations. The goal is that someone who's never touched DeFi could use this app and feel safe.

Track: DeFi UX Challenge
"Make DeFi yield as simple as a savings account" — that's exactly what Shift does.

Try it live: earnflow-app.vercel.app
Source: github.com/shariqazeem/earnflow

Built solo in 7 days. Real deposits. Real yield. Real execution on-chain.

What I'd build next: auto-rebalancing agent that monitors positions and shifts to better rates automatically. Push notifications for rate changes. Fiat on-ramp for a true "savings account" experience.

API feedback for the @lifiprotocol team: The Earn Data API is excellent — vault discovery, pagination, and metadata are well-structured. Composer is genuinely magical for UX — making cross-chain feel like same-chain is the unlock. The main friction was CORS (solved via API proxy) and discovering which vaults have working Composer routes. A "routeable" flag on vaults would save builders significant time. The Positions API could return vault addresses to enable direct withdrawals from any UI.

@lifiprotocol @kenny_io #DeFiMullet

---

# GOOGLE FORM WRITE-UP (paste into submission form)

## What does your project do?

Shift is a DeFi savings account that makes earning yield as simple as a bank deposit. Users connect their wallet, pick any token, and see live-quoted yield options from 20+ protocols — sorted by best value after fees. The key innovation is cross-token optimization: if a user holds ETH but USDC vaults offer higher APY, Shift auto-swaps and deposits via LI.FI Composer in one transaction. Every vault shown has a real Composer quote, so deposits never fail.

## How does it use the Earn API?

- Earn Data API: Vault discovery across all supported protocols and chains, with real-time APY, TVL, and protocol metadata. Used for safety scoring and vault ranking.
- Composer API: Cross-chain and cross-token deposit execution (swap + bridge + vault deposit in one transaction). Also used for quote-first architecture — parallel quotes to multiple vaults before showing options.
- Positions API: On-chain portfolio tracking that works on any device.
- Status API: Cross-chain transaction monitoring for bridge deposits.

## What would you build next?

Auto-rebalancing agent that monitors positions and shifts to better rates automatically. Push notifications for rate changes. Fiat on-ramp integration. Multi-position portfolio view with aggregate yield tracking.

## API feedback

The Earn Data API is excellent — clean pagination, good metadata. Composer is the real unlock — making cross-chain deposits feel like same-chain is what makes a savings account UX possible. Suggestions: (1) Add a "routeable" flag on vaults so builders know which vaults have working Composer routes without testing each one. (2) Include vault addresses in the Positions API response to enable direct withdrawals from any frontend. (3) Consider adding recommended minimum deposit amounts per vault.

---

# TIMING CHEAT SHEET

You are in Pakistan (UTC+5)
Global submission window: April 14, 9AM-12PM ET

| ET | UTC | PKT |
|----|-----|-----|
| 9:00 AM | 1:00 PM | 6:00 PM |
| 10:00 AM | 2:00 PM | 7:00 PM |
| 11:00 AM | 3:00 PM | 8:00 PM |
| 12:00 PM | 4:00 PM | 9:00 PM |

Schedule tweet for: **April 14, 6:00 PM PKT**
Submit Google Form: anytime before 9:00 PM PKT April 14
