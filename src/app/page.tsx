"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { TrendingUp, Wallet, LogOut, ArrowRight, ArrowUpFromLine, Shield, ChevronRight, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTokenBalances, type TokenInfo } from "@/hooks/useTokenBalances";
import { useDeposit } from "@/hooks/useDeposit";
import { useYieldCounter } from "@/hooks/useYieldCounter";
import { useSound } from "@/hooks/useSound";

const ease = [0.25, 0.1, 0.25, 1] as const;
type View = "welcome" | "savings" | "deposit" | "earning";

interface VaultInfo { name: string; address: string; chainId: number; network: string; protocol: string; apy: number; tvl: string; token: { symbol: string; address: string; decimals: number } | null; safety?: { score: number; label: string; trusted: boolean; tvlFormatted: string }; }

function KineticBalance({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => v === 0 ? "$0.00" : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  useEffect(() => { const c = animate(mv, value, { duration: 1, ease: [0.25, 0.1, 0.25, 1] }); return c.stop; }, [value, mv]);
  return <motion.span className="text-[52px] font-light leading-none tracking-[-0.03em] text-[#1D1D1F] tabular sm:text-[64px]">{display}</motion.span>;
}

function EarningScreen({ principal, apy, protocol, network }: { principal: number; apy: number; protocol: string; network: string }) {
  const { earned, total, perDay, perMonth, perYear } = useYieldCounter(principal, apy);
  return (
    <div className="text-center">
      <p className="text-[11px] font-medium text-[#AEAEB2]">Your Savings</p>
      <p className="mt-2 text-[56px] font-light leading-none tracking-[-0.03em] text-[#1D1D1F] tabular sm:text-[64px]">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: total > 100 ? 2 : 6 })}</p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5">
        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
        <span className="text-[13px] font-semibold text-[#34C759] tabular">+${earned.toFixed(6)}</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#F0F0F2] px-4 py-2">
        <Shield className="h-3 w-3 text-[#6E6E73]" /><span className="text-[12px] text-[#6E6E73]">{protocol} · {network} · {apy.toFixed(2)}% APY</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 flex justify-center gap-8">
        {[{ l: "Daily", v: perDay }, { l: "Monthly", v: perMonth }, { l: "Yearly", v: perYear }].map((p) => (
          <div key={p.l} className="text-center"><p className="text-[10px] font-medium text-[#AEAEB2]">{p.l}</p><p className="mt-1 text-[15px] font-semibold text-[#1D1D1F] tabular">+${p.v.toFixed(2)}</p></div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { tokens, isLoading: isLoadingTokens, chainName } = useTokenBalances();
  const depositor = useDeposit();
  const { playDeposit, playSuccess } = useSound();

  const [view, setView] = useState<View>("welcome");
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [alternatives, setAlternatives] = useState<{ name: string; slug: string; address: string; chainId: number; network: string; protocol: string; apy: number; tvl: string }[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isFindingVault, setIsFindingVault] = useState(false);
  const [earningAmount, setEarningAmount] = useState(0);
  const [earningApy, setEarningApy] = useState(0);

  useEffect(() => { if (isConnected && view === "welcome") setView("savings"); }, [isConnected, view]);
  useEffect(() => { if (depositor.status === "success") { playSuccess(); setEarningAmount(parseFloat(depositAmount) || 0); setEarningApy(vault?.apy ?? 0); setView("earning"); } }, [depositor.status, depositAmount, vault, playSuccess]);

  const findVault = useCallback(async (sym: string) => {
    setIsFindingVault(true);
    try { const r = await fetch(`/api/best-vault?token=${sym}`); if (!r.ok) throw 0; const d = await r.json(); setVault(d.vault); setAlternatives(d.alternatives ?? []); } catch { setVault(null); }
    finally { setIsFindingVault(false); }
  }, []);

  const handleSelectToken = useCallback((t: TokenInfo) => { setSelectedToken(t); setView("deposit"); findVault(t.symbol === "WETH" ? "ETH" : t.symbol); }, [findVault]);

  const handleDeposit = useCallback(async () => {
    if (!vault || !depositAmount || !selectedToken) return;
    playDeposit();
    await depositor.deposit({ token: selectedToken, amount: depositAmount, vaultAddress: vault.address, vaultChainId: vault.chainId });
  }, [vault, depositAmount, selectedToken, depositor, playDeposit]);

  const sorted = [...tokens].sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FBFBFD]">
      <div className="pointer-events-none fixed inset-0 -z-10"><div className="ambient-blob" style={{ top: "-20%", right: "-15%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(52,199,89,0.04) 0%, transparent 70%)" }} /></div>
      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col px-6">

        {isConnected && view !== "welcome" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between pb-1 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#34C759]/10"><TrendingUp className="h-4 w-4 text-[#34C759]" strokeWidth={2} /></div>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Shift</span>
            </div>
            <button onClick={() => { disconnect(); setView("welcome"); depositor.reset(); }} className="flex items-center gap-1.5 rounded-full bg-[#F0F0F2] px-3 py-1.5 text-[11px] font-medium text-[#6E6E73] hover:bg-[#E8E8EC]">
              {address?.slice(0, 6)}...{address?.slice(-4)} · {chainName}<LogOut className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {view === "welcome" && (
            <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease }} className="flex flex-1 flex-col items-center justify-center">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease }} className="mb-10">
                <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(52,199,89,0)", "0 0 40px 0 rgba(52,199,89,0.15)", "0 0 0 0 rgba(52,199,89,0)"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#34C759]">
                  <TrendingUp className="h-10 w-10 text-white" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1D1D1F] sm:text-[52px]">Your savings,<br />supercharged.</motion.h1>
              <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-4 max-w-[320px] text-center text-[16px] leading-[1.5] text-[#6E6E73]">Earn up to 10% annually. We find the best yield across 20+ protocols on 60+ chains. One tap.</motion.p>
              <motion.button initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => connect({ connector: injected() })} className="btn-primary mt-10 gap-2 px-8"><Wallet className="h-[18px] w-[18px]" />Connect Wallet</motion.button>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-4 text-[13px] text-[#AEAEB2]">MetaMask, Coinbase, Rainbow & more</motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-16 flex items-center gap-4 text-[11px] text-[#AEAEB2]"><span>20+ protocols</span><span className="text-[#E8E8EC]">·</span><span>60+ chains</span><span className="text-[#E8E8EC]">·</span><span>Powered by LI.FI</span></motion.div>
            </motion.div>
          )}

          {view === "savings" && (
            <motion.div key="s" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="savings-card p-7">
                <p className="text-[13px] font-medium text-[#6E6E73]">Total Savings</p>
                <div className="mt-2"><KineticBalance value={earningAmount} /></div>
                {earningApy > 0 ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5"><motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-[#34C759]" /><span className="text-[13px] font-semibold text-[#34C759] tabular">Earning {earningApy.toFixed(2)}% APY</span></div>
                ) : <p className="mt-3 text-[13px] text-[#AEAEB2]">Deposit tokens to start earning yield</p>}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#AEAEB2]">Your Wallet · {chainName}</p>
                {isLoadingTokens ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-[68px] w-full" />)}</div>
                ) : sorted.length === 0 ? (
                  <div className="card py-8 text-center"><p className="text-[14px] font-medium text-[#1D1D1F]">No tokens found</p><p className="mt-1 text-[12px] text-[#AEAEB2]">Switch to a supported network</p></div>
                ) : (
                  <div className="space-y-2">{sorted.map((token, i) => {
                    const bal = parseFloat(token.balance); const has = bal > 0.0001;
                    return (
                      <motion.button key={token.symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} whileTap={has ? { scale: 0.99 } : {}} onClick={() => has && handleSelectToken(token)} disabled={!has}
                        className={`card flex w-full items-center justify-between !rounded-2xl !p-4 text-left transition-all ${has ? "hover:!shadow-[0_4px_16px_rgba(0,0,0,0.06)] cursor-pointer" : "opacity-40 cursor-default"}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0F0F2]"><span className="text-[18px]">{token.icon}</span></div>
                          <div><p className="text-[15px] font-semibold text-[#1D1D1F]">{token.symbol}</p><p className="text-[12px] text-[#AEAEB2]">{token.name}</p></div>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-semibold text-[#1D1D1F] tabular">{has ? bal.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"}</p>
                          {has && <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-medium text-[#34C759]">Earn yield<ChevronRight className="h-3 w-3" /></p>}
                        </div>
                      </motion.button>
                    );
                  })}</div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-auto pb-8 pt-6">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#AEAEB2]">How Shift works</p>
                {["Pick a token from your wallet", "We find the safest, highest yield", "One tap — bridging & routing handled", "Earn 24/7. Shift to better rates anytime."].map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.06 }} className="mb-2.5 flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0F0F2] text-[11px] font-semibold text-[#6E6E73]">{i + 1}</div>
                    <p className="text-[13px] text-[#6E6E73]">{t}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {view === "deposit" && selectedToken && (
            <motion.div key="d" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setView("savings"); depositor.reset(); }} className="mb-5 self-start text-[14px] font-medium text-[#34C759]">← Back</motion.button>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[28px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">Earn on {selectedToken.symbol}</motion.h1>
              <p className="mt-1 text-[13px] text-[#AEAEB2]">Balance: {parseFloat(selectedToken.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedToken.symbol}</p>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 card p-5">
                <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-[#6E6E73]">Amount</p><button onClick={() => setDepositAmount(parseFloat(selectedToken.balance).toFixed(4))} className="text-[12px] font-medium text-[#34C759] hover:underline">Max</button></div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0" className="flex-1 border-0 bg-transparent text-[36px] font-light tracking-[-0.02em] text-[#1D1D1F] placeholder:text-[#E8E8EC] focus:outline-none tabular" autoFocus />
                  <div className="flex items-center gap-2 rounded-full bg-[#F0F0F2] px-3 py-2"><span className="text-[14px]">{selectedToken.icon}</span><span className="text-[14px] font-semibold text-[#1D1D1F]">{selectedToken.symbol}</span></div>
                </div>
              </motion.div>

              {isFindingVault && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F8F8FA] p-4"><Loader2 className="h-4 w-4 animate-spin text-[#34C759]" /><p className="text-[13px] text-[#6E6E73]">Finding best yield...</p></motion.div>}

              {vault && !isFindingVault && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="card overflow-hidden">
                    <div className="bg-gradient-to-r from-[#34C759]/5 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10"><TrendingUp className="h-5 w-5 text-[#34C759]" /></div><div><p className="text-[14px] font-semibold text-[#1D1D1F]">{vault.protocol}</p><p className="text-[12px] text-[#6E6E73]">{vault.network}</p></div></div>
                        <div className="text-right"><p className="text-[22px] font-light text-[#34C759] tabular">{vault.apy.toFixed(2)}%</p><p className="text-[10px] text-[#AEAEB2]">APY</p></div>
                      </div>
                      {vault.safety && <div className="mt-3 flex items-center gap-2"><div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${vault.safety.score >= 4 ? "bg-[#34C759]/10 text-[#34C759]" : "bg-[#F0F0F2] text-[#6E6E73]"}`}><Shield className="h-2.5 w-2.5" />{vault.safety.label}</div><span className="text-[10px] text-[#AEAEB2]">{vault.safety.tvlFormatted} TVL</span></div>}
                    </div>
                  </div>
                  {alternatives.length > 0 && <div className="mt-3"><p className="mb-2 text-[11px] font-medium text-[#AEAEB2]">Also available</p>{alternatives.map((a, i) => (
                    <motion.button key={`${a.protocol}-${i}`} whileTap={{ scale: 0.99 }} onClick={() => setVault({ ...a, token: vault.token, safety: undefined })} className="mb-1.5 flex w-full items-center justify-between rounded-2xl bg-[#F8F8FA] px-4 py-3 hover:bg-[#F0F0F2]">
                      <div className="text-left"><p className="text-[13px] font-medium text-[#1D1D1F]">{a.protocol}</p><p className="text-[10px] text-[#AEAEB2]">{a.network}</p></div><p className="text-[14px] font-semibold text-[#34C759] tabular">{a.apy.toFixed(2)}%</p>
                    </motion.button>
                  ))}</div>}
                </motion.div>
              )}

              {vault && depositAmount && parseFloat(depositAmount) > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-[#F8F8FA] p-4">
                  <div className="flex justify-between">
                    <div><p className="text-[10px] text-[#AEAEB2]">Monthly</p><p className="text-[15px] font-semibold text-[#1D1D1F] tabular">+{((parseFloat(depositAmount) * vault.apy / 100) / 12).toFixed(2)} {selectedToken.symbol}</p></div>
                    <div className="text-right"><p className="text-[10px] text-[#AEAEB2]">Yearly</p><p className="text-[15px] font-semibold text-[#1D1D1F] tabular">+{(parseFloat(depositAmount) * vault.apy / 100).toFixed(2)} {selectedToken.symbol}</p></div>
                  </div>
                </motion.div>
              )}

              {depositor.error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><p className="text-[13px] text-red-600">{depositor.error}</p></motion.div>}

              {depositor.status !== "idle" && depositor.status !== "error" && depositor.status !== "success" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-[#34C759]/5 p-4"><Loader2 className="h-4 w-4 animate-spin text-[#34C759]" /><p className="text-[13px] font-medium text-[#34C759]">{depositor.statusMessage}</p></motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !vault || isFindingVault || (depositor.status !== "idle" && depositor.status !== "error")} className="btn-primary w-full gap-2">
                  {depositor.status !== "idle" && depositor.status !== "error" && depositor.status !== "success" ? <><Loader2 className="h-[18px] w-[18px] animate-spin" />{depositor.statusMessage}</> : <>Start Earning {vault ? `${vault.apy.toFixed(1)}%` : ""}<ArrowRight className="h-[18px] w-[18px]" /></>}
                </motion.button>
                <p className="mt-3 text-center text-[11px] text-[#AEAEB2]">Cross-chain via LI.FI Composer · One transaction</p>
              </motion.div>
            </motion.div>
          )}

          {view === "earning" && vault && (
            <motion.div key="e" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }} className="flex flex-1 flex-col items-center justify-center">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">{Array.from({ length: 8 }).map((_, i) => (
                <motion.div key={i} initial={{ y: "110%", x: `${15 + Math.random() * 70}%`, opacity: 0 }} animate={{ y: "-10%", opacity: [0, 0.4, 0] }} transition={{ duration: 5 + Math.random() * 3, delay: i * 0.7, repeat: Infinity, ease: "linear" }} className="absolute h-1 w-1 rounded-full bg-[#34C759]" />
              ))}</div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mb-6">
                <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(52,199,89,0)", "0 0 50px 0 rgba(52,199,89,0.15)", "0 0 0 0 rgba(52,199,89,0)"] }} transition={{ duration: 3, repeat: Infinity }} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#34C759]/10"><Sparkles className="h-7 w-7 text-[#34C759]" /></motion.div>
              </motion.div>
              <EarningScreen principal={earningAmount} apy={earningApy} protocol={vault.protocol} network={vault.network} />
              {depositor.result?.txHash && <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} href={depositor.result.explorerUrl ?? `https://etherscan.io/tx/${depositor.result.txHash}`} target="_blank" rel="noopener noreferrer" className="mt-4 text-[11px] text-[#AEAEB2] underline">View transaction</motion.a>}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 max-w-[280px] text-center text-[12px] leading-relaxed text-[#AEAEB2]">Yield accrues on-chain 24/7. Withdraw or shift anytime.</motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-8 flex gap-3">
                <button onClick={() => setView("savings")} className="btn-secondary gap-2 px-6 text-[14px]"><ArrowUpFromLine className="h-4 w-4" />Withdraw</button>
                <button onClick={() => { setView("deposit"); setDepositAmount(""); depositor.reset(); }} className="btn-primary gap-2 px-6 text-[14px]">Add More</button>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-10 text-[10px] text-[#AEAEB2]">Powered by LI.FI Earn + Composer</motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
