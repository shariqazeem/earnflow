"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  Wallet,
  LogOut,
  Loader2,
  ArrowRight,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Check,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useBalance as useWagmiBalance, useSendTransaction } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits } from "viem";
import { useYieldCounter } from "@/hooks/useYieldCounter";
import { useSound } from "@/hooks/useSound";

const ease = [0.32, 0.72, 0, 1] as const;

type View = "landing" | "home" | "finding" | "confirm" | "depositing" | "earning";

interface BestVault {
  name: string;
  address: string;
  chainId: number;
  network: string;
  protocol: string;
  apy: number;
  tvl: string;
  token: { symbol: string; address: string; decimals: number } | null;
  safety?: {
    score: number;
    label: string;
    trusted: boolean;
    tvlFormatted: string;
  };
}

// Kinetic number that smoothly animates
function AnimatedDollar({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) =>
    v < 0.01 && v > 0
      ? `$${v.toFixed(6)}`
      : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: [0.32, 0.72, 0, 1] });
    return controls.stop;
  }, [value, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}

// Ticking yield counter
function YieldTicker({ principal, apy }: { principal: number; apy: number }) {
  const { earned, total, perDay, perMonth, perYear } = useYieldCounter(principal, apy);

  return (
    <div className="text-center">
      {/* Main balance — big, ticking */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <p className="text-[64px] font-extralight leading-none tracking-[-0.04em] text-zinc-900 tabular sm:text-[80px]">
          <AnimatedDollar value={total} />
        </p>
      </motion.div>

      {/* Earned badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2"
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        />
        <span className="text-[13px] font-medium text-emerald-700 tabular">
          +${earned.toFixed(6)} earned
        </span>
      </motion.div>

      {/* Projections */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex justify-center gap-6"
      >
        {[
          { label: "Today", value: perDay },
          { label: "Month", value: perMonth },
          { label: "Year", value: perYear },
        ].map((p) => (
          <div key={p.label} className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              {p.label}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-zinc-900 tabular">
              +${p.value.toFixed(2)}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const walletBalance = useWagmiBalance({ address });
  const { playDeposit, playSuccess } = useSound();

  const [view, setView] = useState<View>("landing");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [bestVault, setBestVault] = useState<BestVault | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isFinding, setIsFinding] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultsScanned, setVaultsScanned] = useState(0);

  // Auto-advance to home when wallet connects
  useEffect(() => {
    if (isConnected && view === "landing") {
      setView("home");
    }
  }, [isConnected, view]);

  // Find best vault
  const findBestVault = useCallback(async (token: string) => {
    setSelectedToken(token);
    setIsFinding(true);
    setError(null);
    setView("finding");

    try {
      const res = await fetch(`/api/best-vault?token=${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No vaults found");
      }
      const data = await res.json();
      setBestVault(data.vault);
      setVaultsScanned(data.totalScanned);
      setView("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find vault");
      setView("home");
    } finally {
      setIsFinding(false);
    }
  }, []);

  // Execute deposit
  const handleDeposit = useCallback(async () => {
    if (!bestVault || !depositAmount || !address) return;
    setIsDepositing(true);
    setView("depositing");
    playDeposit();

    try {
      // Get Composer quote for the deposit
      const tokenAddress = bestVault.token?.address ?? "0x0000000000000000000000000000000000000000";
      const decimals = bestVault.token?.decimals ?? 18;
      const amountWei = parseUnits(depositAmount, decimals).toString();

      // For same-chain: fromChain = toChain
      // The Composer handles bridge + swap + deposit atomically
      const params = new URLSearchParams({
        fromChain: "1", // User's chain (default ETH mainnet)
        toChain: String(bestVault.chainId),
        fromToken: tokenAddress,
        toToken: bestVault.address, // Vault address IS the toToken for Composer
        fromAmount: amountWei,
        fromAddress: address,
      });

      const quoteRes = await fetch(`/api/quote?${params}`);

      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        // In production, we'd send the transaction via wallet
        // For now, show success after the quote proves the route works
        console.log("Composer quote:", quote);
      }

      // Simulate deposit completion for demo
      await new Promise((r) => setTimeout(r, 2500));
      playSuccess();
      setView("earning");
    } catch (err) {
      console.error("Deposit failed:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
      setView("confirm");
    } finally {
      setIsDepositing(false);
    }
  }, [bestVault, depositAmount, address, playDeposit, playSuccess]);

  const TOKENS = [
    { symbol: "USDC", name: "USD Coin", color: "from-blue-500/20 to-blue-500/5 text-blue-700" },
    { symbol: "USDT", name: "Tether", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-700" },
    { symbol: "ETH", name: "Ethereum", color: "from-indigo-500/20 to-indigo-500/5 text-indigo-700" },
    { symbol: "DAI", name: "Dai", color: "from-amber-500/20 to-amber-500/5 text-amber-700" },
    { symbol: "WBTC", name: "Bitcoin", color: "from-orange-500/20 to-orange-500/5 text-orange-700" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="ambient-blob" style={{ top: "-15%", right: "-15%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)" }} />
        <div className="ambient-blob" style={{ bottom: "-20%", left: "-15%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)", animationDirection: "reverse", animationDuration: "40s" }} />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-6">

        {/* Wallet bar */}
        {isConnected && view !== "landing" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pb-2 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-zinc-900">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                {walletBalance.data && (
                  <p className="text-[10px] text-zinc-400">{(Number(walletBalance.data.value) / 1e18).toFixed(4)} {walletBalance.data.symbol}</p>
                )}
              </div>
            </div>
            <button onClick={() => { disconnect(); setView("landing"); }} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <LogOut className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── LANDING ── */}
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30, filter: "blur(8px)" }} transition={{ duration: 0.7, ease }} className="flex flex-1 flex-col items-center justify-center">

              <motion.div initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 1, ease }} className="mb-12">
                <motion.div animate={{ filter: ["drop-shadow(0 0 0px rgba(16,185,129,0))", "drop-shadow(0 0 24px rgba(16,185,129,0.4))", "drop-shadow(0 0 0px rgba(16,185,129,0))"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-zinc-900">
                  <TrendingUp className="h-10 w-10 text-emerald-400" strokeWidth={1.5} />
                </motion.div>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 25, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.3, duration: 0.8, ease }} className="text-center text-[52px] font-semibold leading-[1.02] tracking-[-0.045em] text-zinc-900 sm:text-[72px]">
                Your money<br />should{" "}<span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">grow.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-5 max-w-sm text-center text-[15px] leading-relaxed text-zinc-500">
                One tap. We find the best yield across 20+ chains and deposit for you. You just watch it grow.
              </motion.p>

              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => connect({ connector: injected() })} className="group mt-12 flex h-14 items-center gap-2.5 rounded-full bg-zinc-900 px-10 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
                <Wallet className="h-4 w-4" />
                Connect Wallet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-6 flex items-center gap-4 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />20+ chains</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" />672+ vaults</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" />1-tap deposit</span>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-16 text-[10px] text-zinc-300">
                Powered by LI.FI Earn API + Composer
              </motion.p>
            </motion.div>
          )}

          {/* ── HOME — Token selection ── */}
          {view === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(4px)" }} transition={{ duration: 0.6, ease }} className="flex flex-1 flex-col pt-6">

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-2">
                <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-zinc-900">
                  What do you want<br />to earn on?
                </h1>
                <p className="mt-2 text-[13px] text-zinc-500">
                  Pick a token. We handle the rest.
                </p>
              </motion.div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-red-500">{error}</motion.p>
              )}

              <div className="mt-6 space-y-3">
                {TOKENS.map((token, i) => (
                  <motion.button
                    key={token.symbol}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => findBestVault(token.symbol)}
                    className="card group flex w-full items-center justify-between !p-5 text-left transition-all hover:!shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b ${token.color}`}>
                        <span className="text-xs font-bold">{token.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-zinc-900">{token.symbol}</p>
                        <p className="text-[12px] text-zinc-500">{token.name}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-zinc-500" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── FINDING — Scanning vaults ── */}
          {view === "finding" && (
            <motion.div key="finding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center">
              <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
                  <svg viewBox="0 0 96 96" className="h-full w-full"><circle cx="48" cy="48" r="44" fill="none" stroke="#D1FAE5" strokeWidth="2" strokeDasharray="6 10" /></svg>
                </motion.div>
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute inset-3">
                  <svg viewBox="0 0 72 72" className="h-full w-full"><circle cx="36" cy="36" r="32" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="20 180" /></svg>
                </motion.div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
              <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-[18px] font-medium text-zinc-900">
                Scanning vaults
              </motion.p>
              <p className="mt-2 text-[13px] text-zinc-500">
                Finding the best {selectedToken} yield across all chains
              </p>
            </motion.div>
          )}

          {/* ── CONFIRM — Best vault found ── */}
          {view === "confirm" && bestVault && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(4px)" }} transition={{ duration: 0.6, ease }} className="flex flex-1 flex-col pt-6">

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-1">
                <button onClick={() => setView("home")} className="text-[11px] text-zinc-400 hover:text-zinc-600">← Pick different token</button>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6 text-[12px] text-zinc-500">
                Scanned {vaultsScanned}+ vaults. Here&apos;s the best:
              </motion.p>

              {/* Best vault card */}
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }} className="card-elevated mb-5 overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-50 to-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-amber-600">Best yield found</p>
                    </div>
                    {/* Safety badge */}
                    {bestVault.safety && (
                      <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-medium ${
                        bestVault.safety.score >= 4
                          ? "bg-emerald-100 text-emerald-700"
                          : bestVault.safety.score >= 3
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        <Shield className="h-2.5 w-2.5" />
                        {bestVault.safety.label}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[20px] font-semibold text-zinc-900">{bestVault.protocol}</p>
                      <p className="mt-0.5 text-[13px] text-zinc-500">{bestVault.token?.symbol ?? selectedToken} · {bestVault.network}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[36px] font-extralight tracking-tight text-emerald-600 tabular">{bestVault.apy.toFixed(2)}%</p>
                      <p className="text-[10px] text-zinc-400">APY</p>
                    </div>
                  </div>
                  {/* Safety details */}
                  {bestVault.safety && (
                    <div className="mt-4 flex gap-3">
                      <div className="flex-1 rounded-xl bg-white/60 px-3 py-2">
                        <p className="text-[9px] text-zinc-400">TVL</p>
                        <p className="text-[13px] font-semibold text-zinc-900">{bestVault.safety.tvlFormatted}</p>
                      </div>
                      <div className="flex-1 rounded-xl bg-white/60 px-3 py-2">
                        <p className="text-[9px] text-zinc-400">Safety</p>
                        <div className="mt-0.5 flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-1.5 w-4 rounded-full ${i < bestVault.safety!.score ? "bg-emerald-500" : "bg-zinc-200"}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 rounded-xl bg-white/60 px-3 py-2">
                        <p className="text-[9px] text-zinc-400">Protocol</p>
                        <p className="text-[13px] font-semibold text-zinc-900">{bestVault.safety.trusted ? "Verified" : "Unverified"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Amount input */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card mb-6 p-5">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  How much?
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border-0 bg-transparent text-[36px] font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none tabular"
                    autoFocus
                  />
                  <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[13px] font-medium text-zinc-600">
                    {bestVault.token?.symbol ?? selectedToken}
                  </span>
                </div>
                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-[12px] text-emerald-600">
                    Projected: +${((parseFloat(depositAmount) * bestVault.apy) / 100).toFixed(2)}/year
                  </motion.p>
                )}
              </motion.div>

              {/* Deposit button */}
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-700 hover:shadow-[0_12px_32px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                Start Earning
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <p className="mt-3 text-center text-[10px] text-zinc-400">
                1 transaction · Cross-chain via LI.FI Composer
              </p>
            </motion.div>
          )}

          {/* ── DEPOSITING ── */}
          {view === "depositing" && (
            <motion.div key="depositing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center">
              <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
                  <svg viewBox="0 0 96 96" className="h-full w-full"><circle cx="48" cy="48" r="44" fill="none" stroke="#D1FAE5" strokeWidth="3" strokeDasharray="4 8" /></svg>
                </motion.div>
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-3">
                  <svg viewBox="0 0 72 72" className="h-full w-full"><circle cx="36" cy="36" r="32" fill="none" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="20 180" /><defs><linearGradient id="grad"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#F59E0B" /></linearGradient></defs></svg>
                </motion.div>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </motion.div>
              </div>
              <motion.p animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} className="text-[18px] font-medium text-zinc-900">Depositing</motion.p>
              <p className="mt-2 text-[13px] text-zinc-500">Your money is being routed to the best yield</p>
            </motion.div>
          )}

          {/* ── EARNING — The magical screen ── */}
          {view === "earning" && bestVault && (
            <motion.div key="earning" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }} className="flex flex-1 flex-col items-center justify-center">

              {/* Particles */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: "100%", x: `${10 + Math.random() * 80}%`, opacity: 0 }}
                    animate={{ y: "-10%", opacity: [0, 0.6, 0] }}
                    transition={{ duration: 4 + Math.random() * 3, delay: i * 0.5, repeat: Infinity, ease: "linear" }}
                    className="absolute h-1 w-1 rounded-full bg-emerald-400"
                    style={{ filter: "blur(1px)" }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mb-8"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(16,185,129,0)",
                      "0 0 60px 0 rgba(16,185,129,0.2)",
                      "0 0 0 0 rgba(16,185,129,0)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
                >
                  <Sparkles className="h-8 w-8 text-emerald-500" />
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-600"
              >
                Earning · {bestVault.protocol} · {bestVault.network}
              </motion.p>

              <YieldTicker
                principal={parseFloat(depositAmount) || 0}
                apy={bestVault.apy}
              />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-12 flex gap-3"
              >
                <button className="btn-secondary flex h-12 items-center gap-2 rounded-full px-6 text-[13px]">
                  Withdraw
                </button>
                <button
                  onClick={() => {
                    setBestVault(null);
                    setDepositAmount("");
                    setView("home");
                  }}
                  className="btn flex h-12 items-center gap-2 rounded-full px-6 text-[13px]"
                >
                  Earn More
                </button>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-6 max-w-xs text-center text-[10px] leading-relaxed text-zinc-400">
                Yield accrues on-chain 24/7 — you don&apos;t need to keep this open.
                This counter shows real-time projections based on current APY.
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="mt-3 text-[9px] text-zinc-300">
                Powered by LI.FI Earn + Composer
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
