"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Mic,
  Shield,
  Zap,
  Globe,
  Wallet,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { useVoice, parseVoiceCommand } from "@/hooks/useVoice";
import { VoiceButton } from "@/components/VoiceButton";
import { RoutePipeline, type RouteStep } from "@/components/RoutePipeline";
import {
  fetchAllVaults,
  getVaultApy,
  formatApy,
  formatTvl,
  getVaultToken,
  searchVaults,
  type Vault,
} from "@/lib/lifi";

const ease = [0.32, 0.72, 0, 1] as const;

type View = "home" | "results" | "route" | "depositing" | "success";

export default function Home() {
  const voice = useVoice();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const balance = useBalance({ address });

  const [view, setView] = useState<View>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [isLoadingVaults, setIsLoadingVaults] = useState(true);
  const [filteredVaults, setFilteredVaults] = useState<Vault[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  // Load all vaults on mount
  useEffect(() => {
    setIsLoadingVaults(true);
    fetchAllVaults()
      .then(setAllVaults)
      .catch(console.error)
      .finally(() => setIsLoadingVaults(false));
  }, []);

  // Voice handling
  useEffect(() => {
    if (!voice.isListening && voice.transcript) {
      const intent = parseVoiceCommand(voice.transcript);
      if (intent.action === "find_yield") {
        handleSearch(intent.token ?? "USDC");
      } else if (intent.action === "deposit" && intent.amount) {
        setDepositAmount(intent.amount);
        if (filteredVaults.length > 0) {
          handleSelectVault(filteredVaults[0], intent.amount);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isListening, voice.transcript]);

  // Search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setView("results");
    setTimeout(() => {
      const results = searchVaults(allVaults, query);
      results.sort((a, b) => getVaultApy(b) - getVaultApy(a));
      setFilteredVaults(results);
      setIsSearching(false);
    }, 100);
  }, [allVaults]);

  // Select vault
  const handleSelectVault = useCallback((vault: Vault, amount?: string) => {
    setSelectedVault(vault);
    setView("route");
    const tokenSymbol = getVaultToken(vault);
    const steps: RouteStep[] = [
      { type: "source", label: `Your ${tokenSymbol}`, sublabel: isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect wallet" },
    ];
    if (vault.chainId !== 1) {
      steps.push({ type: "bridge", label: `Bridge to ${vault.network}`, sublabel: "via LI.FI Composer" });
    }
    steps.push({ type: "deposit", label: `Deposit into ${vault.protocol.name}`, sublabel: `${vault.description || vault.name}` });
    setRouteSteps(steps);
    if (amount) setDepositAmount(amount);
  }, [isConnected, address]);

  // Deposit
  const handleDeposit = useCallback(async () => {
    if (!selectedVault || !depositAmount) return;
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }
    setView("depositing");
    // TODO: Real Composer execution with wallet signing
    await new Promise((r) => setTimeout(r, 3000));
    setView("success");
  }, [selectedVault, depositAmount, isConnected, connect]);

  const resetToHome = useCallback(() => {
    setView("home");
    setSelectedVault(null);
    setDepositAmount("");
    setFilteredVaults([]);
    setSearchQuery("");
    setSelectedChain(null);
  }, []);

  // Top vaults for home
  const topVaults = useMemo(() =>
    allVaults
      .filter((v) => getVaultApy(v) > 0 && parseFloat(v.analytics?.tvl?.usd || "0") > 100000)
      .sort((a, b) => getVaultApy(b) - getVaultApy(a))
      .slice(0, 6),
    [allVaults]
  );

  // Unique chains for filter
  const chains = useMemo(() => {
    const set = new Set(filteredVaults.map((v) => v.network));
    return Array.from(set).sort();
  }, [filteredVaults]);

  // Filtered by chain
  const displayVaults = useMemo(() => {
    if (!selectedChain) return filteredVaults;
    return filteredVaults.filter((v) => v.network === selectedChain);
  }, [filteredVaults, selectedChain]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="ambient-blob" style={{ top: "-10%", right: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)" }} />
        <div className="ambient-blob" style={{ bottom: "-20%", left: "-10%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)", animationDirection: "reverse", animationDuration: "40s" }} />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-8">

        {/* Wallet bar — always visible when connected */}
        {isConnected && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-900">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                {balance.data && (
                  <p className="text-[9px] text-zinc-400">{(Number(balance.data.value) / 1e18).toFixed(4)} {balance.data.symbol}</p>
                )}
              </div>
            </div>
            <button onClick={() => disconnect()} className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── HOME ── */}
          {view === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(4px)" }} transition={{ duration: 0.6, ease }} className="flex flex-1 flex-col pt-10">

              {/* Logo + branding */}
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease }} className="mb-8 flex items-center gap-3">
                <motion.div animate={{ filter: ["drop-shadow(0 0 0px rgba(16,185,129,0))", "drop-shadow(0 0 16px rgba(16,185,129,0.4))", "drop-shadow(0 0 0px rgba(16,185,129,0))"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-zinc-900">
                  <TrendingUp className="h-6 w-6 text-emerald-400" strokeWidth={2} />
                </motion.div>
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-zinc-900">EarnFlow</h2>
                  <p className="text-[11px] text-zinc-400">Talk to DeFi</p>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-[44px] font-semibold leading-[1.05] tracking-[-0.04em] text-zinc-900 sm:text-[56px]">
                Find the<br />best{" "}<span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">yield.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-3 max-w-xs text-[14px] leading-relaxed text-zinc-500">
                {isLoadingVaults ? "Loading vaults..." : `${allVaults.length}+ vaults across 20+ chains.`} Voice or type. Your money flows to the highest yield.
              </motion.p>

              {/* Search + Voice */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-8 flex items-center gap-3">
                <div className="card flex flex-1 items-center !rounded-2xl px-4 !p-0">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder='Search token, protocol, chain...' className="flex-1 border-0 bg-transparent py-3.5 pl-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none" onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) handleSearch(searchQuery); }} />
                </div>
                {voice.isSupported && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={voice.isListening ? voice.stopListening : voice.startListening} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all ${voice.isListening ? "bg-amber-500 text-white shadow-amber-200" : "bg-zinc-900 text-white"}`}>
                    <Mic className="h-5 w-5" />
                  </motion.button>
                )}
              </motion.div>

              <AnimatePresence>
                {voice.isListening && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-center text-[12px] text-amber-600">
                    {voice.transcript || 'Try: "Find yield for USDC"'}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Quick tokens */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-4 flex flex-wrap gap-2">
                {["USDC", "ETH", "USDT", "DAI", "WBTC", "Aave", "Base"].map((t) => (
                  <button key={t} onClick={() => handleSearch(t)} className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200">{t}</button>
                ))}
              </motion.div>

              {/* Wallet connect */}
              {!isConnected && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-6">
                  <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => connect({ connector: injected() })} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </motion.button>
                </motion.div>
              )}

              {/* Top vaults */}
              {!isLoadingVaults && topVaults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-8">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">Top Yield Right Now</p>
                  </div>
                  <div className="space-y-2">
                    {topVaults.map((vault, i) => (
                      <VaultRow key={vault.slug} vault={vault} index={i} baseDelay={0.8} onClick={() => handleSelectVault(vault)} />
                    ))}
                  </div>
                </motion.div>
              )}

              {isLoadingVaults && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 space-y-3">
                  {[1, 2, 3, 4].map((i) => (<div key={i} className="skeleton h-[60px] w-full" />))}
                </motion.div>
              )}

              {/* Footer stats */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-auto flex items-center justify-center gap-5 pt-8">
                {[{ icon: Globe, label: "20+ chains" }, { icon: Shield, label: `${allVaults.length}+ vaults` }, { icon: Zap, label: "1-click deposit" }].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-[10px] text-zinc-400"><s.icon className="h-3 w-3" />{s.label}</div>
                ))}
              </motion.div>
              <p className="mt-3 text-center text-[9px] text-zinc-300">Powered by LI.FI Earn API + Composer</p>
            </motion.div>
          )}

          {/* ── RESULTS ── */}
          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(4px)" }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <div className="mb-4">
                <button onClick={resetToHome} className="mb-3 flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600"><ArrowLeft className="h-3 w-3" />Back</button>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-zinc-900">&ldquo;{searchQuery}&rdquo;</h1>
                <p className="mt-0.5 text-[12px] text-zinc-500">{displayVaults.length} vaults · Sorted by APY</p>
              </div>

              {/* Chain filter pills */}
              {chains.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <button onClick={() => setSelectedChain(null)} className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${!selectedChain ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>All</button>
                  {chains.map((c) => (
                    <button key={c} onClick={() => setSelectedChain(c)} className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${selectedChain === c ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>{c}</button>
                  ))}
                </div>
              )}

              {isSearching ? (
                <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="skeleton h-[64px] w-full" />))}</div>
              ) : displayVaults.length === 0 ? (
                <div className="py-16 text-center"><p className="text-base font-medium text-zinc-900">No vaults found</p><p className="mt-1 text-sm text-zinc-500">Try a different search</p></div>
              ) : (
                <div className="space-y-2">
                  {displayVaults.slice(0, 30).map((vault, i) => (
                    <VaultRow key={vault.slug} vault={vault} index={i} baseDelay={0} onClick={() => handleSelectVault(vault)} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── ROUTE ── */}
          {view === "route" && selectedVault && (
            <motion.div key="route" initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(4px)" }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col pt-6">
              <button onClick={() => setView("results")} className="mb-5 flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600"><ArrowLeft className="h-3 w-3" />Back</button>

              {/* Vault hero */}
              <div className="card-elevated mb-5 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50"><span className="text-xs font-bold text-emerald-700">{getVaultToken(selectedVault).slice(0, 3)}</span></div>
                    <div>
                      <p className="text-[16px] font-semibold text-zinc-900">{selectedVault.protocol.name}</p>
                      <p className="text-[12px] text-zinc-500">{selectedVault.description || selectedVault.name} · {selectedVault.network}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[24px] font-semibold text-emerald-600 tabular">{formatApy(getVaultApy(selectedVault))}</p>
                    <p className="text-[10px] text-zinc-400">APY</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 rounded-xl bg-zinc-50 px-3 py-2"><p className="text-[9px] text-zinc-400">TVL</p><p className="text-[13px] font-semibold text-zinc-900">{formatTvl(selectedVault.analytics?.tvl?.usd)}</p></div>
                  <div className="flex-1 rounded-xl bg-zinc-50 px-3 py-2"><p className="text-[9px] text-zinc-400">Chain</p><p className="text-[13px] font-semibold text-zinc-900">{selectedVault.network}</p></div>
                  <div className="flex-1 rounded-xl bg-zinc-50 px-3 py-2"><p className="text-[9px] text-zinc-400">Protocol</p><a href={selectedVault.protocol.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[13px] font-semibold text-zinc-900 hover:text-emerald-600">{selectedVault.protocol.name}<ExternalLink className="h-3 w-3" /></a></div>
                </div>
              </div>

              {/* Amount */}
              <div className="card mb-4 p-5">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">Deposit Amount</p>
                <div className="flex items-center gap-2">
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" className="flex-1 border-0 bg-transparent text-[32px] font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none tabular" autoFocus />
                  <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600">{getVaultToken(selectedVault)}</span>
                </div>
              </div>

              {/* Route */}
              <RoutePipeline steps={routeSteps} amount={depositAmount} token={getVaultToken(selectedVault)} apy={formatApy(getVaultApy(selectedVault))} />

              {/* Deposit CTA */}
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-700 disabled:opacity-40 disabled:shadow-none">
                {!isConnected ? (
                  <><Wallet className="h-4 w-4" />Connect Wallet to Deposit</>
                ) : (
                  <>Deposit {depositAmount || "0"} {getVaultToken(selectedVault)}<ArrowRight className="h-4 w-4" /></>
                )}
              </motion.button>
              <p className="mt-3 text-center text-[10px] text-zinc-400">Powered by LI.FI Composer · Cross-chain routing</p>
            </motion.div>
          )}

          {/* DEPOSITING */}
          {view === "depositing" && (
            <motion.div key="depositing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center">
              <div className="relative mb-10 flex h-20 w-20 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0"><svg viewBox="0 0 80 80" className="h-full w-full"><circle cx="40" cy="40" r="36" fill="none" stroke="#D1FAE5" strokeWidth="3" strokeDasharray="4 8" /></svg></motion.div>
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute inset-3"><svg viewBox="0 0 56 56" className="h-full w-full"><circle cx="28" cy="28" r="24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeDasharray="15 140" /></svg></motion.div>
                <TrendingUp className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-[18px] font-medium text-zinc-900">Routing your deposit</p>
              <p className="mt-2 text-sm text-zinc-500">Bridge → Swap → Deposit</p>
            </motion.div>
          )}

          {/* SUCCESS */}
          {view === "success" && selectedVault && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"><Sparkles className="h-10 w-10 text-emerald-500" /></motion.div>
              <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-zinc-900">Earning yield</h1>
              <p className="mt-2 text-base text-zinc-500">{depositAmount} {getVaultToken(selectedVault)} → {selectedVault.protocol.name} on {selectedVault.network}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{formatApy(getVaultApy(selectedVault))} APY</p>
              <button onClick={resetToHome} className="btn mt-8"><span className="flex items-center gap-2">Find more yield<ArrowRight className="h-4 w-4" /></span></button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Vault Row Component ──
function VaultRow({ vault, index, baseDelay, onClick }: { vault: Vault; index: number; baseDelay: number; onClick: () => void }) {
  const apy = getVaultApy(vault);
  const tokenSymbol = getVaultToken(vault);
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: baseDelay + index * 0.04 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <span className="text-[10px] font-bold text-emerald-700">{tokenSymbol.slice(0, 3)}</span>
        </div>
        <div className="text-left">
          <p className="text-[13px] font-medium text-zinc-900">{vault.protocol.name}</p>
          <p className="text-[10px] text-zinc-500">{tokenSymbol} · {vault.network} · {formatTvl(vault.analytics?.tvl?.usd)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-[14px] font-semibold tabular ${apy > 5 ? "text-emerald-600" : "text-zinc-900"}`}>{formatApy(apy)}</p>
        <p className="text-[9px] text-zinc-400">APY</p>
      </div>
    </motion.button>
  );
}
