# Shift — DeFi Mullet Hackathon Winning Plan

## Deadline: April 14, 2026 (Monday) — 2.5 days left
## Submission window: 9:00 AM - 12:00 PM ET (6:00 PM - 9:00 PM PKT)
## Prize target: Grand Prize $1,000

## Current state
- App: earnflow-app.vercel.app
- Repo: github.com/shariqazeem/earnflow
- LI.FI API key: set on Vercel as LIFI_API_KEY
- Wallet connection: works (wagmi, 7 chains)
- Vault discovery: works (Earn API, safety scoring)
- Composer quote: works (proxied through /api/quote)
- ERC20 approval: added but untested
- Deposit execution: sends real tx to wallet
- Positions view: fetches from LI.FI but basic UI
- UI: functional but NOT premium — needs cinematic overhaul

## What's missing to WIN

### Priority 1: Make deposits ACTUALLY work end-to-end
- Test ERC20 approval flow with real USDC
- Verify Composer quote returns valid transactionRequest
- Handle chain switching if user is on wrong chain
- Add slippage parameter to quote
- Test with small amount ($1 USDC)

### Priority 2: Cinematic UI overhaul (see UI_PLAN.md for full details)
- Welcome screen: word-by-word blur reveal, breathing logo, ghost balance in background, particles
- Savings home: centered balance, horizontal token scroller, live feed, spacious layout
- Deposit flow: massive amount input, vault card slides in with spring physics, projected earnings animate as you type
- Earning screen: giant ticking counter, floating particles, milestone celebrations with sound
- All transitions: blur + scale + directional slide

### Priority 3: Portfolio positions view
- After deposit, show real LI.FI positions
- Each position: protocol, chain, token, balance, APY
- Withdraw button per position (via Composer)

### Priority 4: Complete the "Shift" feature
- When user has an active position, scan for better vaults
- Show "Better rate available: X% → Y%" card
- One tap to migrate (withdraw from A + deposit into B via Composer)
- This is the DIFFERENTIATOR — no one else will have cross-chain yield migration

## LI.FI MCP Server
Install: npx -y @anthropic-ai/claude-code mcp add lifi-mcp -- npx -y @anthropic-ai/mcp-remote https://mcp.li.fi/mcp
This gives Claude direct access to LI.FI APIs for testing and integration.

## Judging criteria reminder
- API Integration: 35% — use BOTH Earn Data API AND Composer
- Innovation: 25% — savings account metaphor + shift feature + social elements
- Product Completeness: 20% — full flow: deposit → earn → shift → withdraw
- Presentation: 20% — cinematic UI + demo video + tweet

## Tweet requirements
- Must include: "I just built X with LI.FI Earn..."
- Must include: project name + what it does + demo + link + track
- Must tag: @lifiprotocol and @kenny_io
- Must post during submission window on April 14

## Track: DeFi UX Challenge
"Make DeFi yield as simple as a savings account" — this IS our pitch.

## Architecture
```
/api/vaults         — proxy to earn.li.fi/v1/earn/vaults (CORS-safe)
/api/best-vault     — scans all vaults, safety scoring, returns best + alternatives
/api/quote          — proxy to li.quest/v1/quote (Composer, needs API key)
/api/status         — proxy to li.quest/v1/status (track cross-chain tx)
/api/positions      — proxy to earn.li.fi/v1/earn/portfolio/:address/positions
```

## Files to focus on
- src/app/page.tsx — main app (1400+ lines, all views)
- src/hooks/useDeposit.ts — deposit execution with approval
- src/hooks/useTokenBalances.ts — wallet balance reading
- src/hooks/useYieldCounter.ts — real-time yield animation
- src/hooks/useSound.ts — audio feedback
- src/components/LiveFeed.tsx — social proof feed
- src/components/Leaderboard.tsx — competitive element
- src/components/MilestoneCelebration.tsx — milestone celebrations
- src/app/globals.css — design system
- src/providers/Web3Provider.tsx — wagmi config

## Design system: "Apple Savings"
- Background: #FBFBFD
- Accent: #34C759 (Apple green) — USE SPARINGLY, mostly neutral
- Text: #1D1D1F primary, #6E6E73 secondary, #AEAEB2 tertiary
- Cards: 0.5px border-shadow, 20px radius
- Buttons: 14px radius, green primary, #F0F0F2 secondary
- Font: Inter, light weight for big numbers
- Light mode ONLY
- Easing: [0.25, 0.1, 0.25, 1]

## Execution order for new conversation
1. Install LI.FI MCP server
2. Test deposit flow end-to-end (quote → approve → send)
3. Fix any issues found
4. Cinematic UI overhaul on all screens
5. Add "Shift" migration feature
6. Deploy after each change
7. Record demo video April 13
8. Write and schedule tweet for April 14 morning
9. Submit Google Form
