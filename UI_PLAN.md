# Shift UI Overhaul — "Million Dollar First Impression"

## Context
Shift is a DeFi savings account app for the LI.FI DeFi Mullet Hackathon ($5000 pool, $1000 grand prize).
- **Deadline: April 14, 2026**
- **Live at: earnflow-app.vercel.app**
- **Repo: github.com/shariqazeem/earnflow**
- **Track: DeFi UX Challenge + Open Track**

The backend is DONE — real wallet balances (wagmi), real Composer quotes, real transaction execution, safety scoring, status tracking. All works.

The UI needs a COMPLETE cinematic overhaul. The user (Shariq) is an expert UI builder who won the Starkzap hackathon with premium Apple-level design. He wants the same quality here.

## Design System: "Apple Savings"
- Background: #FBFBFD (off-white, not pure white)
- Accent: #34C759 (Apple green — exact)
- Text: #1D1D1F primary, #6E6E73 secondary, #AEAEB2 tertiary
- Cards: 0.5px border-shadow, 20px radius, soft layered shadows
- Buttons: 14px radius, Apple green primary, #F0F0F2 secondary
- Font: Inter, light weight for big numbers, semibold for labels
- No dark mode. Light only. Peaceful, trustworthy, premium.
- All animations via Framer Motion with [0.25, 0.1, 0.25, 1] easing

## What needs to happen

### 1. Cinematic Welcome Screen
Current: Just a logo, headline, and button. Boring.
Needed:
- Staggered word-by-word headline reveal with blur-to-clear
- Logo with breathing green glow that pulses like a heartbeat
- Floating savings amount preview in background (e.g., "$12,847.23" faintly visible, slowly incrementing)
- Subtle particle field of tiny green dots drifting upward (money growing metaphor)
- The "Connect Wallet" button should have a magnetic hover effect (glows when mouse approaches)
- Stats at bottom fade in with stagger: "20+ protocols · 60+ chains · Powered by LI.FI"
- Total animation duration: ~2 seconds from load to fully visible
- Everything should feel like an Apple product launch page

### 2. Savings Home — The Dashboard
Current: Card + token list. Functional but flat.
Needed:
- The savings card should feel ALIVE — subtle gradient that shifts slowly, soft inner glow
- Balance number should use kinetic typography — smoothly counts up when it changes
- "Earning X% APY" badge should pulse gently with the green dot
- Token list should have micro-interactions: hover lifts the card slightly, press depresses
- "Earn yield →" text on each token should slide in on hover (hidden by default, appears on hover)
- Chain name badge in the header should have a subtle indicator dot
- "How it works" steps should cascade in with stagger animation when scrolled into view
- Empty state for $0 savings should have an inviting illustration/animation

### 3. Deposit Flow
Current: Works but feels like a form.
Needed:
- Amount input should be MASSIVE (like Apple Pay) with the token icon floating next to it
- Typing amount should feel satisfying — each digit springs in with micro-bounce
- Vault card should slide in from the right with spring physics when found
- Safety badge should have a subtle shimmer if score >= 4
- Alternatives should be swipeable horizontal cards (not vertical list)
- Projected earnings should animate counting up as you type the amount
- "Start Earning" button should have a gradient shimmer on hover
- Loading states should use the cinematic spinning rings from the current shifting screen

### 4. Earning Screen — The Dopamine Machine
Current: Counter + particles. Good but needs more soul.
Needed:
- The balance number should be HUGE and feel weighty — light font, extreme tracking
- The "+$0.000XXX earned" counter should have a soft green glow behind it
- Particles should be more organic — different sizes, some with trails
- A subtle ambient sound option (toggleable) — soft generative music that matches the earning rate
- The daily/monthly/yearly projections should have a small bar chart visualization
- Periodic "milestone" celebrations — when earned crosses $0.01, $0.10, $1.00, play a subtle chime
- The whole screen should feel meditative — like watching your garden grow

### 5. Transitions Between Views
Current: Basic opacity fade.
Needed:
- Each view transition should use blur + scale + y-offset (not just opacity)
- Going deeper (welcome → savings → deposit) should slide left
- Going back should slide right
- The savings card should "morph" into the deposit card when transitioning
- Success transition should have a brief "flash" of green before the earning screen appears

### 6. Mobile Polish
- All touch targets 44px minimum
- Bottom sheet for token selection on mobile
- Haptic-style visual feedback on every tap (scale: 0.97)
- Numpad-style amount input option for mobile
- Safe area padding for iPhone notch

## Files to modify
- `src/app/globals.css` — add new animation keyframes, polish card styles
- `src/app/page.tsx` — complete rewrite of all 4 views
- `src/app/layout.tsx` — already good
- `src/hooks/useYieldCounter.ts` — already good
- `src/hooks/useDeposit.ts` — already good
- `src/hooks/useTokenBalances.ts` — already good
- `src/hooks/useSound.ts` — enhance with ambient earning sound + milestone chimes

## Tech Stack
- Next.js 16 (Turbopack for dev, webpack for build)
- Tailwind CSS 4
- Framer Motion for all animations
- wagmi + viem for wallet connection
- LI.FI Earn API + Composer (proxied through /api/)

## After UI overhaul
- Deploy: `cd /Users/macbookair/projects/earnflow && npm run build && vercel deploy --prod --yes`
- Alias: `vercel alias [deployment] earnflow-app.vercel.app`
- Push: `git add -A && git commit -m "..." && git push origin main`

## The bar
Look at: Apple Savings Account, Robinhood, Revolut, Cash App.
The user should feel: "This is the most beautiful DeFi app I've ever seen."
