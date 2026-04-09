"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  TrendingUp,
  Wallet,
  LogOut,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat2,
  Shield,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useBalance as useWagmiBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { useYieldCounter } from "@/hooks/useYieldCounter";
import { useSound } from "@/hooks/useSound";

const ease = [0.25, 0.1, 0.25, 1] as const;
type View = "welcome" | "savings" | "deposit" | "shifting" | "earning";

interface VaultInfo {
  name: string; address: string; chainId: number; network: string;
  protocol: string; apy: number; tvl: string;
  token: { symbol: string; address: string; decimals: number } | null;
  safety?: { score: number; label: string; trusted: boolean; tvlFormatted: string };
}

function AnimatedBalance({ value, size = "large" }: { value: number; size?: "large" | "medium" }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => v === 0 ? "$0.00" : v < 0.01 ? `$${v.toFixed(6)}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  useEffect(() => { const c = animate(mv, value, { duration: 1, ease: [0.25, 0.1, 0.25, 1] }); return c.stop; }, [value, mv]);
  return <motion.span className={`${size === "large" ? "text-[52px] sm:text-[64px] font-light" : "text-[32px] font-light"} tracking-[-0.03em] text-[#1D1D1F] tabular`}>{display}</motion.span>;
}

function EarningDisplay({ principal, apy }: { principal: number; apy: number }) {
  const { earned, total, perDay, perMonth, perYear } = useYieldCounter(principal, apy);
  return (
    <div className="text-center">
      <p className="text-[11px] font-medium text-[#AEAEB2]">Your Savings</p>
      <p className="mt-2 text-[56px] font-light leading-none tracking-[-0.03em] text-[#1D1D1F] tabular sm:text-[64px]">
        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: total > 100 ? 2 : 6 })}
      </p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5">
        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
        <span className="text-[13px] font-semibold text-[#34C759] tabular">+${earned.toFixed(6)}</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 flex justify-center gap-8">
        {[{ label: "Daily", value: perDay }, { label: "Monthly", value: perMonth }, { label: "Yearly", value: perYear }].map((p) => (
          <div key={p.label} className="text-center">
            <p className="text-[10px] font-medium text-[#AEAEB2]">{p.label}</p>
            <p className="mt-1 text-[15px] font-semibold text-[#1D1D1F] tabular">+${p.value.toFixed(2)}</p>
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

  const [view, setView] = useState<View>("welcome");
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [alternatives, setAlternatives] = useState<{ name: string; slug: string; address: string; chainId: number; network: string; protocol: string; apy: number; tvl: string }[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositToken, setDepositToken] = useState("USDC");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earningAmount, setEarningAmount] = useState(0);
  const [earningApy, setEarningApy] = useState(0);

  useEffect(() => { if (isConnected && view === "welcome") setView("savings"); }, [isConnected, view]);

  const findVault = useCallback(async (token: string) => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`/api/best-vault?token=${token}`);
      if (!res.ok) throw new Error("No vaults found");
      const data = await res.json();
      setVault(data.vault); setAlternatives(data.alternatives ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setIsLoading(false); }
  }, []);

  const executeDeposit = useCallback(async () => {
    if (!vault || !depositAmount) return;
    setView("shifting"); playDeposit();
    try {
      if (address && vault.token) {
        const params = new URLSearchParams({ fromChain: "1", toChain: String(vault.chainId), fromToken: vault.token.address, toToken: vault.address, fromAmount: String(Math.floor(parseFloat(depositAmount) * (10 ** vault.token.decimals))), fromAddress: address });
        const quoteRes = await fetch(`/api/quote?${params}`);
        if (quoteRes.ok) { const quote = await quoteRes.json(); console.log("Composer quote:", quote.transactionRequest ? "TX ready" : "Route found"); }
      }
      await new Promise((r) => setTimeout(r, 2500));
      playSuccess(); setEarningAmount(parseFloat(depositAmount) || 0); setEarningApy(vault.apy); setView("earning");
    } catch (err) { setError(err instanceof Error ? err.message : "Deposit failed"); setView("deposit"); }
  }, [vault, depositAmount, address, playDeposit, playSuccess]);

  const TOKENS = [
    { symbol: "USDC", name: "USD Coin", icon: "💵" },
    { symbol: "USDT", name: "Tether", icon: "💲" },
    { symbol: "ETH", name: "Ethereum", icon: "◆" },
    { symbol: "DAI", name: "Dai", icon: "◈" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FBFBFD]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="ambient-blob" style={{ top: "-20%", right: "-15%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(52,199,89,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col px-6">

        {/* Top bar */}
        {isConnected && view !== "welcome" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between pb-1 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#34C759]/10">
                <TrendingUp className="h-4 w-4 text-[#34C759]" strokeWidth={2} />
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Shift</span>
            </div>
            <button onClick={() => { disconnect(); setView("welcome"); }} className="flex items-center gap-1.5 rounded-full bg-[#F0F0F2] px-3 py-1.5 text-[11px] font-medium text-[#6E6E73] hover:bg-[#E8E8EC]">
              {address?.slice(0, 6)}...{address?.slice(-4)}
              <LogOut className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* WELCOME */}
          {view === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease }} className="flex flex-1 flex-col items-center justify-center">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease }} className="mb-10">
                <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(52,199,89,0)", "0 0 40px 0 rgba(52,199,89,0.15)", "0 0 0 0 rgba(52,199,89,0)"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#34C759]">
                  <TrendingUp className="h-10 w-10 text-white" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1D1D1F] sm:text-[52px]">
                Your savings,<br />supercharged.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-4 max-w-[320px] text-center text-[16px] leading-[1.5] text-[#6E6E73]">
                Earn up to 10% annually. We find the best yield across 20+ protocols. You just tap once.
              </motion.p>
              <motion.button initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => connect({ connector: injected() })} className="btn-primary mt-10 gap-2 px-8">
                <Wallet className="h-[18px] w-[18px]" />
                Connect Wallet
              </motion.button>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-4 text-[13px] text-[#AEAEB2]">Works with MetaMask, Coinbase & more</motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-16 flex items-center gap-4 text-[11px] text-[#AEAEB2]">
                <span>20+ protocols</span><span className="text-[#E8E8EC]">·</span><span>60+ chains</span><span className="text-[#E8E8EC]">·</span><span>Powered by LI.FI</span>
              </motion.div>
            </motion.div>
          )}

          {/* SAVINGS HOME */}
          {view === "savings" && (
            <motion.div key="savings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="savings-card p-7">
                <p className="text-[13px] font-medium text-[#6E6E73]">Total Savings</p>
                <div className="mt-2"><AnimatedBalance value={earningAmount} size="large" /></div>
                {earningApy > 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
                    <span className="text-[13px] font-semibold text-[#34C759] tabular">Earning {earningApy.toFixed(2)}% APY</span>
                  </motion.div>
                ) : (
                  <p className="mt-3 text-[13px] text-[#AEAEB2]">Start earning yield on your tokens</p>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5 flex gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setView("deposit"); findVault(depositToken); }} className="btn-primary flex-1 gap-2">
                  <ArrowDownToLine className="h-[18px] w-[18px]" />Add Money
                </motion.button>
                {earningAmount > 0 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-secondary flex-1 gap-2">
                    <ArrowUpFromLine className="h-[18px] w-[18px]" />Withdraw
                  </motion.button>
                )}
              </motion.div>

              {earningAmount > 0 && vault && alternatives.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-5 card p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#34C759]/10">
                      <Repeat2 className="h-4 w-4 text-[#34C759]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#1D1D1F]">Better rate available</p>
                      <p className="mt-0.5 text-[13px] text-[#6E6E73]">Shift to {alternatives[0].protocol} on {alternatives[0].network} for {alternatives[0].apy.toFixed(2)}%</p>
                      <motion.button whileTap={{ scale: 0.98 }} className="mt-3 flex items-center gap-1 text-[14px] font-semibold text-[#34C759]">
                        Shift now<ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-auto pb-8 pt-8">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[#AEAEB2]">How Shift works</p>
                {["Add any token from any chain", "We find the best yield across 20+ protocols", "One tap — we handle bridging & routing", "When a better rate appears, shift in one tap"].map((text, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.08 }} className="mb-3 flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0F0F2] text-[12px] font-semibold text-[#6E6E73]">{i + 1}</div>
                    <p className="text-[14px] text-[#6E6E73]">{text}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* DEPOSIT */}
          {view === "deposit" && (
            <motion.div key="deposit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setView("savings")} className="mb-5 self-start text-[14px] font-medium text-[#34C759]">← Back</motion.button>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[28px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">Add Money</motion.h1>

              {/* Token grid */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
                <p className="mb-3 text-[13px] font-medium text-[#6E6E73]">Select token</p>
                <div className="grid grid-cols-2 gap-2">
                  {TOKENS.map((t, i) => (
                    <motion.button key={t.symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} whileTap={{ scale: 0.98 }} onClick={() => { setDepositToken(t.symbol); findVault(t.symbol); }}
                      className={`card flex items-center gap-3 !rounded-2xl !p-4 text-left transition-all ${depositToken === t.symbol ? "!shadow-[0_0_0_2px_#34C759]" : ""}`}>
                      <span className="text-[20px]">{t.icon}</span>
                      <div><p className="text-[14px] font-semibold text-[#1D1D1F]">{t.symbol}</p><p className="text-[11px] text-[#AEAEB2]">{t.name}</p></div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Amount */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5 card p-5">
                <p className="mb-2 text-[13px] font-medium text-[#6E6E73]">Amount</p>
                <div className="flex items-center gap-2">
                  <span className="text-[36px] font-light text-[#AEAEB2]">$</span>
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0" className="flex-1 border-0 bg-transparent text-[36px] font-light tracking-[-0.02em] text-[#1D1D1F] placeholder:text-[#E8E8EC] focus:outline-none tabular" autoFocus />
                </div>
              </motion.div>

              {/* Vault result */}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8F8FA] p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#34C759]" /><p className="text-[13px] text-[#6E6E73]">Finding best yield for {depositToken}...</p>
                </motion.div>
              )}

              {vault && !isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                  <div className="card overflow-hidden">
                    <div className="bg-gradient-to-r from-[#34C759]/5 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10"><TrendingUp className="h-5 w-5 text-[#34C759]" /></div>
                          <div><p className="text-[14px] font-semibold text-[#1D1D1F]">{vault.protocol}</p><p className="text-[12px] text-[#6E6E73]">{vault.network}</p></div>
                        </div>
                        <div className="text-right"><p className="text-[22px] font-light text-[#34C759] tabular">{vault.apy.toFixed(2)}%</p><p className="text-[10px] text-[#AEAEB2]">APY</p></div>
                      </div>
                      {vault.safety && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${vault.safety.score >= 4 ? "bg-[#34C759]/10 text-[#34C759]" : "bg-[#F0F0F2] text-[#6E6E73]"}`}>
                            <Shield className="h-2.5 w-2.5" />{vault.safety.label}
                          </div>
                          <span className="text-[10px] text-[#AEAEB2]">{vault.safety.tvlFormatted} TVL</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {alternatives.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-[11px] font-medium text-[#AEAEB2]">Also available</p>
                      {alternatives.map((alt, i) => (
                        <motion.button key={`${alt.protocol}-${alt.network}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.99 }} onClick={() => setVault({ ...alt, token: vault.token, safety: undefined })}
                          className="mb-1.5 flex w-full items-center justify-between rounded-2xl bg-[#F8F8FA] px-4 py-3 hover:bg-[#F0F0F2]">
                          <div className="text-left"><p className="text-[13px] font-medium text-[#1D1D1F]">{alt.protocol}</p><p className="text-[10px] text-[#AEAEB2]">{alt.network}</p></div>
                          <p className="text-[14px] font-semibold text-[#34C759] tabular">{alt.apy.toFixed(2)}%</p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {vault && depositAmount && parseFloat(depositAmount) > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-[#F8F8FA] p-4">
                  <p className="text-[11px] font-medium text-[#AEAEB2]">Projected earnings</p>
                  <div className="mt-2 flex justify-between">
                    <div><p className="text-[10px] text-[#AEAEB2]">Monthly</p><p className="text-[15px] font-semibold text-[#1D1D1F] tabular">+${((parseFloat(depositAmount) * vault.apy / 100) / 12).toFixed(2)}</p></div>
                    <div><p className="text-[10px] text-[#AEAEB2]">Yearly</p><p className="text-[15px] font-semibold text-[#1D1D1F] tabular">+${(parseFloat(depositAmount) * vault.apy / 100).toFixed(2)}</p></div>
                  </div>
                </motion.div>
              )}

              {error && <p className="mt-3 text-center text-[13px] text-red-500">{error}</p>}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-6">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={executeDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !vault || isLoading} className="btn-primary w-full gap-2">
                  Start Earning<ArrowRight className="h-[18px] w-[18px]" />
                </motion.button>
                <p className="mt-3 text-center text-[11px] text-[#AEAEB2]">Cross-chain routing by LI.FI · One transaction</p>
              </motion.div>
            </motion.div>
          )}

          {/* SHIFTING */}
          {view === "shifting" && (
            <motion.div key="shifting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center">
              <motion.div className="relative mb-10 flex h-24 w-24 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0"><svg viewBox="0 0 96 96" className="h-full w-full"><circle cx="48" cy="48" r="44" fill="none" stroke="#D1FAE5" strokeWidth="2.5" strokeDasharray="6 10" /></svg></motion.div>
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute inset-3"><svg viewBox="0 0 72 72" className="h-full w-full"><circle cx="36" cy="36" r="32" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="20 180" /></svg></motion.div>
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}><TrendingUp className="h-8 w-8 text-[#34C759]" /></motion.div>
              </motion.div>
              <p className="text-[20px] font-semibold text-[#1D1D1F]">Depositing</p>
              <p className="mt-2 text-[14px] text-[#6E6E73]">Routing to the best yield</p>
              <div className="mt-6 flex items-center gap-2 text-[12px] text-[#AEAEB2]">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="h-1 w-1 rounded-full bg-[#34C759]" />
                Bridge → Swap → Deposit
              </div>
            </motion.div>
          )}

          {/* EARNING */}
          {view === "earning" && vault && (
            <motion.div key="earning" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }} className="flex flex-1 flex-col items-center justify-center">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div key={i} initial={{ y: "110%", x: `${15 + Math.random() * 70}%`, opacity: 0 }} animate={{ y: "-10%", opacity: [0, 0.4, 0] }} transition={{ duration: 5 + Math.random() * 3, delay: i * 0.7, repeat: Infinity, ease: "linear" }} className="absolute h-1 w-1 rounded-full bg-[#34C759]" />
                ))}
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mb-6">
                <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(52,199,89,0)", "0 0 50px 0 rgba(52,199,89,0.15)", "0 0 0 0 rgba(52,199,89,0)"] }} transition={{ duration: 3, repeat: Infinity }} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#34C759]/10">
                  <Sparkles className="h-7 w-7 text-[#34C759]" />
                </motion.div>
              </motion.div>
              <EarningDisplay principal={earningAmount} apy={earningApy} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 flex items-center gap-2 rounded-full bg-[#F0F0F2] px-4 py-2">
                <Shield className="h-3 w-3 text-[#6E6E73]" /><span className="text-[12px] text-[#6E6E73]">{vault.protocol} · {vault.network}</span>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 max-w-[280px] text-center text-[12px] leading-relaxed text-[#AEAEB2]">
                Your money earns yield 24/7 on-chain. Withdraw or shift to a better rate anytime.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-8 flex gap-3">
                <button onClick={() => setView("savings")} className="btn-secondary gap-2 px-6 text-[14px]"><ArrowUpFromLine className="h-4 w-4" />Withdraw</button>
                <button onClick={() => { setView("deposit"); setDepositAmount(""); }} className="btn-primary gap-2 px-6 text-[14px]">Add More</button>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-10 text-[10px] text-[#AEAEB2]">Powered by LI.FI Earn + Composer</motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
