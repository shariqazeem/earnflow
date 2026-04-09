"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  TrendingUp,
  Zap,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useVoice, parseVoiceCommand } from "@/hooks/useVoice";
import { VoiceButton } from "@/components/VoiceButton";
import { RoutePipeline, type RouteStep } from "@/components/RoutePipeline";
import {
  getVaults,
  formatApy,
  formatTvl,
  type Vault,
} from "@/lib/lifi";

const ease = [0.32, 0.72, 0, 1] as const;

type View = "home" | "results" | "route" | "depositing" | "success";

export default function Home() {
  const voice = useVoice();
  const [view, setView] = useState<View>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);

  // Handle voice command completion
  useEffect(() => {
    if (!voice.isListening && voice.transcript) {
      const intent = parseVoiceCommand(voice.transcript);
      if (intent.action === "find_yield") {
        handleSearch(intent.token ?? "USDC");
      } else if (intent.action === "deposit" && intent.amount) {
        setDepositAmount(intent.amount);
        if (!selectedVault && vaults.length > 0) {
          handleSelectVault(vaults[0], intent.amount);
        }
      } else if (intent.action === "show_positions") {
        // TODO: show positions view
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isListening, voice.transcript]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    setView("results");
    try {
      const results = await getVaults({
        token: query.toUpperCase(),
        limit: 20,
      });
      // Sort by APY descending
      const sorted = results.sort((a, b) => {
        const apyA = a.apy ?? a.apy7d ?? 0;
        const apyB = b.apy ?? b.apy7d ?? 0;
        return apyB - apyA;
      });
      setVaults(sorted);
    } catch (err) {
      console.error("Search failed:", err);
      setVaults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectVault = useCallback(
    (vault: Vault, amount?: string) => {
      setSelectedVault(vault);
      setView("route");

      // Build route visualization
      const steps: RouteStep[] = [
        {
          type: "source",
          label: `Your ${vault.token.symbol}`,
          sublabel: "Wallet",
        },
      ];

      // If cross-chain, add bridge step
      if (vault.chainId !== 1) {
        steps.push({
          type: "bridge",
          label: `Bridge to ${vault.chain}`,
          sublabel: "via LI.FI Composer",
        });
      }

      // If token mismatch, add swap step
      if (
        vault.depositToken &&
        vault.depositToken.symbol !== vault.token.symbol
      ) {
        steps.push({
          type: "swap",
          label: `Swap to ${vault.depositToken.symbol}`,
          sublabel: "via AVNU/1inch",
        });
      }

      // Deposit step
      steps.push({
        type: "deposit",
        label: `Deposit into ${vault.protocol}`,
        sublabel: `${vault.name} on ${vault.chain}`,
      });

      setRouteSteps(steps);
      if (amount) setDepositAmount(amount);
    },
    []
  );

  const handleDeposit = useCallback(async () => {
    if (!selectedVault || !depositAmount) return;
    setView("depositing");
    // Simulate deposit for hackathon demo (real execution needs wallet connection)
    await new Promise((r) => setTimeout(r, 3000));
    setView("success");
  }, [selectedVault, depositAmount]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="ambient-blob"
          style={{
            top: "-10%",
            right: "-10%",
            width: "50vw",
            height: "50vw",
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="ambient-blob"
          style={{
            bottom: "-20%",
            left: "-10%",
            width: "60vw",
            height: "60vw",
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)",
            animationDirection: "reverse",
            animationDuration: "40s",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-8">
        <AnimatePresence mode="wait">
          {/* HOME — Voice + Search */}
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.6, ease }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease }}
                className="mb-10"
              >
                <motion.div
                  animate={{
                    filter: [
                      "drop-shadow(0 0 0px rgba(16, 185, 129, 0))",
                      "drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))",
                      "drop-shadow(0 0 0px rgba(16, 185, 129, 0))",
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-zinc-900"
                >
                  <TrendingUp className="h-9 w-9 text-emerald-400" strokeWidth={2} />
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center text-[48px] font-semibold leading-[1.02] tracking-[-0.04em] text-zinc-900 sm:text-[64px]"
              >
                Talk to
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                  DeFi.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 max-w-xs text-center text-[14px] leading-relaxed text-zinc-500"
              >
                Say what you want. Your money flows to the best yield across 20+ chains.
              </motion.p>

              {/* Voice button */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-10"
              >
                <VoiceButton
                  isListening={voice.isListening}
                  onToggle={
                    voice.isListening
                      ? voice.stopListening
                      : voice.startListening
                  }
                  isSupported={voice.isSupported}
                  transcript={voice.transcript}
                />
              </motion.div>

              {/* Text search fallback */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-6 w-full max-w-sm"
              >
                <div className="card flex items-center !rounded-2xl px-4 !p-0">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Try "USDC", "ETH", "DAI"...'
                    className="flex-1 border-0 bg-transparent py-4 pl-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        handleSearch(searchQuery);
                      }
                    }}
                  />
                  <button
                    onClick={() => searchQuery && handleSearch(searchQuery)}
                    className="rounded-full bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-700"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Quick tokens */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-5 flex gap-2"
              >
                {["USDC", "ETH", "USDT", "DAI"].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSearch(t)}
                    className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
                  >
                    {t}
                  </button>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-16 text-[10px] text-zinc-300"
              >
                Powered by LI.FI Earn API + Composer
              </motion.p>
            </motion.div>
          )}

          {/* RESULTS — Vault list */}
          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease }}
              className="flex flex-1 flex-col pt-12"
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setView("home")}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600"
                  >
                    ← Back
                  </button>
                  <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-zinc-900">
                    Best yield for {searchQuery.toUpperCase()}
                  </h1>
                </div>
                <VoiceButton
                  isListening={voice.isListening}
                  onToggle={
                    voice.isListening
                      ? voice.stopListening
                      : voice.startListening
                  }
                  isSupported={voice.isSupported}
                  transcript={voice.transcript}
                />
              </div>

              {/* Vault list */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-20 w-full" />
                  ))}
                </div>
              ) : vaults.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-base font-medium text-zinc-900">
                    No vaults found
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Try a different token
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vaults.map((vault, i) => {
                    const apy = vault.apy ?? vault.apy7d ?? 0;
                    return (
                      <motion.button
                        key={vault.id || `${vault.protocol}-${vault.chain}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectVault(vault)}
                        className="card flex w-full items-center justify-between !p-4 text-left transition-all hover:!shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                      >
                        <div className="flex items-center gap-3">
                          {vault.token.logoURI ? (
                            <img
                              src={vault.token.logoURI}
                              alt={vault.token.symbol}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                              <span className="text-[10px] font-bold text-zinc-700">
                                {vault.token.symbol.slice(0, 3)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-medium text-zinc-900">
                              {vault.protocol}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {vault.chain} · TVL {formatTvl(vault.tvl)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-[15px] font-semibold tabular ${
                              apy > 0.05
                                ? "text-emerald-600"
                                : "text-zinc-900"
                            }`}
                          >
                            {formatApy(apy)}
                          </p>
                          <p className="text-[10px] text-zinc-400">APY</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ROUTE — Pipeline visualization */}
          {view === "route" && selectedVault && (
            <motion.div
              key="route"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease }}
              className="flex flex-1 flex-col pt-12"
            >
              <button
                onClick={() => setView("results")}
                className="mb-6 text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                ← Back to results
              </button>

              {/* Vault header */}
              <div className="card-elevated mb-6 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedVault.token.logoURI ? (
                      <img
                        src={selectedVault.token.logoURI}
                        alt={selectedVault.token.symbol}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                        <span className="text-xs font-bold text-zinc-700">
                          {selectedVault.token.symbol.slice(0, 3)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-[16px] font-semibold text-zinc-900">
                        {selectedVault.protocol}
                      </p>
                      <p className="text-[12px] text-zinc-500">
                        {selectedVault.name} · {selectedVault.chain}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[24px] font-semibold text-emerald-600 tabular">
                      {formatApy(selectedVault.apy ?? selectedVault.apy7d ?? 0)}
                    </p>
                    <p className="text-[10px] text-zinc-400">APY</p>
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div className="card mb-4 p-5">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  Deposit Amount
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border-0 bg-transparent text-[32px] font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none tabular"
                  />
                  <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600">
                    {selectedVault.token.symbol}
                  </span>
                </div>
              </div>

              {/* Route pipeline */}
              <RoutePipeline
                steps={routeSteps}
                amount={depositAmount}
                token={selectedVault.token.symbol}
                apy={formatApy(selectedVault.apy ?? selectedVault.apy7d ?? 0)}
              />

              {/* Deposit button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="btn mt-6 h-14 w-full bg-emerald-600 text-[15px] font-semibold shadow-[0_8px_24px_rgba(16,185,129,0.25)] hover:bg-emerald-700 hover:shadow-[0_12px_32px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                <span className="flex items-center gap-2">
                  Deposit {depositAmount || "0"}{" "}
                  {selectedVault.token.symbol}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
              <p className="mt-3 text-center text-[10px] text-zinc-400">
                Powered by LI.FI Composer · Cross-chain · Gasless routing
              </p>
            </motion.div>
          )}

          {/* DEPOSITING */}
          {view === "depositing" && (
            <motion.div
              key="depositing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-8 h-12 w-12 rounded-full border-[3px] border-emerald-200 border-t-emerald-600"
              />
              <p className="text-[18px] font-medium text-zinc-900">
                Routing your deposit
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Bridge → Swap → Deposit — all in one transaction
              </p>
            </motion.div>
          )}

          {/* SUCCESS */}
          {view === "success" && selectedVault && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
              >
                <Sparkles className="h-10 w-10 text-emerald-500" />
              </motion.div>

              <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-zinc-900">
                Earning yield
              </h1>
              <p className="mt-2 text-base text-zinc-500">
                {depositAmount} {selectedVault.token.symbol} → {selectedVault.protocol} on{" "}
                {selectedVault.chain}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">
                {formatApy(selectedVault.apy ?? selectedVault.apy7d ?? 0)} APY
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-10 flex flex-col gap-3"
              >
                <button
                  onClick={() => {
                    setView("home");
                    setSelectedVault(null);
                    setDepositAmount("");
                    setVaults([]);
                    setSearchQuery("");
                  }}
                  className="btn"
                >
                  <span className="flex items-center gap-2">
                    Deposit more
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
