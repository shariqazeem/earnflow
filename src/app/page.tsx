"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  TrendingUp,
  Wallet,
  LogOut,
  ArrowRight,
  ArrowUpFromLine,
  Shield,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTokenBalances, type TokenInfo } from "@/hooks/useTokenBalances";
import { useDeposit } from "@/hooks/useDeposit";
import { useYieldCounter } from "@/hooks/useYieldCounter";
import { useSound } from "@/hooks/useSound";
import { LiveFeed } from "@/components/LiveFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { MilestoneCelebration } from "@/components/MilestoneCelebration";

/* ─── Constants ─── */
const ease = [0.25, 0.1, 0.25, 1] as const;
type View = "welcome" | "savings" | "deposit" | "earning";
const VIEW_ORDER: View[] = ["welcome", "savings", "deposit", "earning"];

interface VaultInfo {
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

/* ─── Branded Token Icons ─── */
const TOKEN_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  WETH: "#627EEA",
  USDC: "#2775CA",
  USDT: "#26A17B",
  DAI: "#F5AC37",
  MATIC: "#8247E5",
  POL: "#8247E5",
  AVAX: "#E84142",
  BNB: "#F3BA2F",
  OP: "#FF0420",
  ARB: "#12AAFF",
};

function TokenIcon({
  symbol,
  size = 44,
}: {
  symbol: string;
  size?: number;
}) {
  const color = TOKEN_COLORS[symbol] ?? "#6E6E73";
  const glyph =
    symbol === "ETH" || symbol === "WETH"
      ? "Ξ"
      : symbol === "USDC" || symbol === "USDT"
        ? "$"
        : symbol[0];
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `${color}14`,
      }}
    >
      <span
        className="font-bold leading-none"
        style={{ color, fontSize: size * 0.36 }}
      >
        {glyph}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CINEMATIC COMPONENTS
   ═══════════════════════════════════════════════════ */

/** Word-by-word headline reveal with blur-to-clear */
function WordReveal({
  lines,
  delay = 0,
  className,
}: {
  lines: string[];
  delay?: number;
  className?: string;
}) {
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07, delayChildren: delay },
    },
  };
  const child = {
    hidden: { opacity: 0, y: 14, filter: "blur(12px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease },
    },
  };

  return (
    <motion.h1
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(" ").map((w, wi) => (
            <motion.span
              key={`${li}-${wi}`}
              className="inline-block"
              variants={child}
            >
              {w}&nbsp;
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

/** Faint floating savings preview in background */
function FloatingAmount() {
  const mv = useMotionValue(12847.23);
  const display = useTransform(
    mv,
    (v) =>
      `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    const id = setInterval(() => mv.set(mv.get() + Math.random() * 0.015), 150);
    return () => clearInterval(id);
  }, [mv]);

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 select-none whitespace-nowrap"
      animate={{ y: [-8, 8, -8] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.span className="text-[72px] font-extralight tracking-[-0.04em] text-[#1D1D1F]/[0.03] tabular sm:text-[96px]">
        {display}
      </motion.span>
    </motion.div>
  );
}

/** Green particles drifting upward — money growing */
function ParticleField({
  count = 24,
  variant = "default",
}: {
  count?: number;
  variant?: "default" | "organic";
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 5 + Math.random() * 90,
        size:
          variant === "organic"
            ? 1.5 + Math.random() * 4
            : 1 + Math.random() * 2.5,
        duration: 5 + Math.random() * 9,
        delay: Math.random() * 6,
        opacity:
          variant === "organic"
            ? 0.15 + Math.random() * 0.35
            : 0.1 + Math.random() * 0.2,
        hasTrail: variant === "organic" && Math.random() > 0.5,
        trailH: 14 + Math.random() * 24,
      })),
    [count, variant]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%` }}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{ y: "-10vh", opacity: [0, p.opacity, p.opacity, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div
            className="rounded-full bg-[#34C759]"
            style={{ width: p.size, height: p.size }}
          />
          {p.hasTrail && (
            <div
              className="absolute left-1/2 top-full w-px -translate-x-1/2 bg-gradient-to-b from-[#34C759]/20 to-transparent"
              style={{ height: p.trailH }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Button with magnetic hover — pulls toward cursor + glows */
function MagneticButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);
  const boxShadow = useTransform(
    glow,
    (v) => `0 0 ${v * 30}px rgba(52,199,89,${v * 0.35})`
  );

  return (
    <motion.button
      ref={ref}
      style={{ x, y, boxShadow }}
      className={className}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        x.set(dx * 0.15);
        y.set(dy * 0.15);
        glow.set(Math.max(0, 1 - dist / 200));
      }}
      onMouseLeave={() => {
        animate(x, 0, { duration: 0.4 });
        animate(y, 0, { duration: 0.4 });
        animate(glow, 0, { duration: 0.4 });
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

/** Smoothly counting balance display */
function KineticBalance({
  value,
  size = "default",
}: {
  value: number;
  size?: "default" | "hero";
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) =>
    v === 0
      ? "$0.00"
      : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    const c = animate(mv, value, { duration: 1.2, ease });
    return c.stop;
  }, [value, mv]);

  const cls =
    size === "hero"
      ? "text-[56px] font-extralight tracking-[-0.04em] sm:text-[72px]"
      : "text-[48px] font-light tracking-[-0.03em] sm:text-[60px]";

  return (
    <motion.span className={`${cls} leading-none text-[#1D1D1F] tabular`}>
      {display}
    </motion.span>
  );
}

/** Mini bar chart for daily/monthly/yearly projections */
function ProjectionBars({
  perDay,
  perMonth,
  perYear,
}: {
  perDay: number;
  perMonth: number;
  perYear: number;
}) {
  const max = perYear || 1;
  const bars = [
    { label: "Daily", value: perDay, pct: (perDay / max) * 100 },
    { label: "Monthly", value: perMonth, pct: (perMonth / max) * 100 },
    { label: "Yearly", value: perYear, pct: 100 },
  ];

  return (
    <div className="flex justify-center gap-10">
      {bars.map((b, i) => (
        <motion.div
          key={b.label}
          className="flex flex-col items-center gap-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 + i * 0.1 }}
        >
          <div className="relative h-14 w-7 overflow-hidden rounded-full bg-[#F0F0F2]">
            <motion.div
              className="absolute bottom-0 w-full rounded-full bg-[#34C759]/20"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(b.pct, 10)}%` }}
              transition={{ delay: 1.1 + i * 0.15, duration: 0.8, ease }}
            />
          </div>
          <p className="text-[10px] font-medium text-[#AEAEB2]">{b.label}</p>
          <p className="text-[14px] font-semibold text-[#1D1D1F] tabular">
            +${b.value.toFixed(2)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/** The dopamine machine — live yield counter with milestones */
function EarningScreen({
  principal,
  apy,
  protocol,
  network,
  onMilestone,
}: {
  principal: number;
  apy: number;
  protocol: string;
  network: string;
  onMilestone?: (m: number) => void;
}) {
  const { earned, total, perDay, perMonth, perYear } = useYieldCounter(
    principal,
    apy
  );
  const { playEarning } = useSound();
  const lastMilestone = useRef(0);

  useEffect(() => {
    const milestones = [0.01, 0.1, 1, 10, 100, 1000];
    for (const m of milestones) {
      if (earned >= m && lastMilestone.current < m) {
        lastMilestone.current = m;
        playEarning();
        onMilestone?.(m);
      }
    }
  }, [earned, playEarning, onMilestone]);

  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#AEAEB2]"
      >
        Your Savings
      </motion.p>

      <motion.p
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease }}
        className="mt-3 text-[56px] font-extralight leading-none tracking-[-0.04em] text-[#1D1D1F] tabular sm:text-[72px]"
      >
        $
        {total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: total > 100 ? 2 : 6,
        })}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#34C759]/10 px-4 py-2 shadow-[0_0_24px_rgba(52,199,89,0.1)]"
      >
        <motion.div
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-[#34C759]"
        />
        <span className="text-[14px] font-semibold text-[#34C759] tabular">
          +${earned.toFixed(6)}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#F0F0F2] px-4 py-2.5"
      >
        <Shield className="h-3.5 w-3.5 text-[#6E6E73]" />
        <span className="text-[13px] text-[#6E6E73]">
          {protocol} &middot; {network} &middot; {apy.toFixed(2)}% APY
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8"
      >
        <ProjectionBars
          perDay={perDay}
          perMonth={perMonth}
          perYear={perYear}
        />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   VIEW TRANSITION SYSTEM
   ═══════════════════════════════════════════════════ */

const slideVariants = {
  enter: (d: number) => ({
    x: d > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease },
  },
  exit: (d: number) => ({
    x: d > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.96,
    filter: "blur(6px)",
    transition: { duration: 0.35, ease },
  }),
};

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { tokens, isLoading: isLoadingTokens, chainName } = useTokenBalances();
  const depositor = useDeposit();
  const { playDeposit, playSuccess } = useSound();

  const [view, setView] = useState<View>("welcome");
  const [direction, setDirection] = useState(1);
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [alternatives, setAlternatives] = useState<
    {
      name: string;
      slug: string;
      address: string;
      chainId: number;
      network: string;
      protocol: string;
      apy: number;
      tvl: string;
    }[]
  >([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isFindingVault, setIsFindingVault] = useState(false);
  const [earningAmount, setEarningAmount] = useState(0);
  const [earningApy, setEarningApy] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);

  /* ─── Navigation ─── */
  const viewRef = useRef(view);
  viewRef.current = view;

  const navigateTo = useCallback((v: View) => {
    const cur = VIEW_ORDER.indexOf(viewRef.current);
    const next = VIEW_ORDER.indexOf(v);
    setDirection(next >= cur ? 1 : -1);
    setView(v);
  }, []);

  useEffect(() => {
    if (isConnected && view === "welcome") navigateTo("savings");
  }, [isConnected, view, navigateTo]);

  useEffect(() => {
    if (depositor.status === "success") {
      playSuccess();
      setShowFlash(true);
      const t = setTimeout(() => {
        setShowFlash(false);
        setEarningAmount(parseFloat(depositAmount) || 0);
        setEarningApy(vault?.apy ?? 0);
        navigateTo("earning");
      }, 450);
      return () => clearTimeout(t);
    }
  }, [depositor.status, depositAmount, vault, playSuccess, navigateTo]);

  /* ─── Vault lookup ─── */
  const findVault = useCallback(async (sym: string) => {
    setIsFindingVault(true);
    try {
      const r = await fetch(`/api/best-vault?token=${sym}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setVault(d.vault);
      setAlternatives(d.alternatives ?? []);
    } catch {
      setVault(null);
    } finally {
      setIsFindingVault(false);
    }
  }, []);

  const handleSelectToken = useCallback(
    (t: TokenInfo) => {
      setSelectedToken(t);
      navigateTo("deposit");
      findVault(t.symbol === "WETH" ? "ETH" : t.symbol);
    },
    [findVault, navigateTo]
  );

  const handleDeposit = useCallback(async () => {
    if (!vault || !depositAmount || !selectedToken) return;
    playDeposit();
    await depositor.deposit({
      token: selectedToken,
      amount: depositAmount,
      vaultAddress: vault.address,
      vaultChainId: vault.chainId,
    });
  }, [vault, depositAmount, selectedToken, depositor, playDeposit]);

  const sorted = [...tokens].sort(
    (a, b) => parseFloat(b.balance) - parseFloat(a.balance)
  );
  const withBalance = sorted.filter(
    (t) => parseFloat(t.balance) > 0.0001
  );
  const projMonthly =
    vault && depositAmount && parseFloat(depositAmount) > 0
      ? (parseFloat(depositAmount) * vault.apy) / 100 / 12
      : 0;
  const projYearly =
    vault && depositAmount && parseFloat(depositAmount) > 0
      ? (parseFloat(depositAmount) * vault.apy) / 100
      : 0;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#FBFBFD]">
      {/* Ambient background blob */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="ambient-blob"
          style={{
            top: "-20%",
            right: "-15%",
            width: "60vw",
            height: "60vw",
            background:
              "radial-gradient(circle, rgba(52,199,89,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Green flash overlay on deposit success */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-50 bg-[#34C759]"
          />
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-6">
        {/* ─── Header ─── */}
        {isConnected && view !== "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between pb-1 pt-5"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#34C759]/10">
                <TrendingUp
                  className="h-4 w-4 text-[#34C759]"
                  strokeWidth={2}
                />
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                Shift
              </span>
            </div>
            <button
              onClick={() => {
                disconnect();
                navigateTo("welcome");
                depositor.reset();
              }}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#F0F0F2] px-3 py-2 text-[11px] font-medium text-[#6E6E73] transition-colors hover:bg-[#E8E8EC] active:scale-[0.97]"
            >
              <div className="mr-0.5 h-1.5 w-1.5 rounded-full bg-[#34C759]" />
              {address?.slice(0, 6)}...{address?.slice(-4)} &middot;{" "}
              {chainName}
              <LogOut className="ml-1 h-3 w-3" />
            </button>
          </motion.div>
        )}

        {/* ─── Views ─── */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ════════════════════════════════════
              WELCOME — Cinematic First Impression
              ════════════════════════════════════ */}
          {view === "welcome" && (
            <motion.div
              key="w"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-center"
            >
              <FloatingAmount />
              <ParticleField count={20} />

              {/* Logo with breathing glow */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease }}
                className="relative mb-10"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0px 0px rgba(52,199,89,0)",
                      "0 0 40px 8px rgba(52,199,89,0.2)",
                      "0 0 0px 0px rgba(52,199,89,0)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#34C759]"
                >
                  <TrendingUp
                    className="h-10 w-10 text-white"
                    strokeWidth={1.5}
                  />
                </motion.div>
              </motion.div>

              {/* Word-by-word headline */}
              <WordReveal
                lines={["Your savings,", "supercharged."]}
                delay={0.3}
                className="text-center text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1D1D1F] sm:text-[52px]"
              />

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.7, duration: 0.6, ease }}
                className="mt-5 max-w-[320px] text-center text-[16px] leading-[1.55] text-[#6E6E73]"
              >
                Earn up to 10% annually. We find the best yield across 20+
                protocols on 60+ chains. One tap.
              </motion.p>

              {/* Magnetic connect button */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5, ease }}
              >
                <MagneticButton
                  onClick={() => connect({ connector: injected() })}
                  className="btn-primary mt-10 gap-2 px-8"
                >
                  <Wallet className="h-[18px] w-[18px]" />
                  Connect Wallet
                </MagneticButton>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-4 text-[13px] text-[#AEAEB2]"
              >
                MetaMask, Coinbase, Rainbow & more
              </motion.p>

              {/* Stats with stagger */}
              <motion.div
                className="mt-16 flex items-center gap-5"
                initial="hidden"
                animate="show"
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 1.3,
                    },
                  },
                }}
              >
                {["20+ protocols", "60+ chains", "Powered by LI.FI"].map(
                  (s, i, arr) => (
                    <motion.span
                      key={s}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className="flex items-center gap-5 text-[11px] text-[#AEAEB2]"
                    >
                      {s}
                      {i < arr.length - 1 && (
                        <span className="text-[#E8E8EC]">&middot;</span>
                      )}
                    </motion.span>
                  )
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              SAVINGS — The Dashboard
              ════════════════════════════════════ */}
          {view === "savings" && (
            <motion.div
              key="s"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col pt-4"
            >
              {/* Balance — clean, centered, breathing room */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="py-10 text-center"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#AEAEB2]">
                  Total Savings
                </p>
                <div className="mt-3">
                  <KineticBalance value={earningAmount} />
                </div>
                {earningApy > 0 ? (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1D1D1F]/[0.04] px-3.5 py-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-1.5 w-1.5 rounded-full bg-[#1D1D1F]"
                    />
                    <span className="text-[12px] font-medium text-[#1D1D1F] tabular">
                      {earningApy.toFixed(2)}% APY
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-[#AEAEB2]">
                    Choose a token below to start earning
                  </p>
                )}
              </motion.div>

              {/* Horizontal token scroller */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#AEAEB2]">
                  Earn on · {chainName}
                </p>

                {isLoadingTokens ? (
                  <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-28 shrink-0" />)}
                  </div>
                ) : withBalance.length === 0 ? (
                  <div className="card py-10 text-center">
                    <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F0F2]">
                      <Wallet className="h-7 w-7 text-[#AEAEB2]" />
                    </motion.div>
                    <p className="text-[15px] font-semibold text-[#1D1D1F]">No tokens found</p>
                    <p className="mx-auto mt-1.5 max-w-[240px] text-[12px] text-[#AEAEB2]">
                      Transfer tokens to your wallet on any supported chain
                    </p>
                  </div>
                ) : (
                  <div className="scroll-snap-x flex gap-2.5 pb-1">
                    {withBalance.map((token, i) => {
                      const bal = parseFloat(token.balance);
                      return (
                        <motion.button
                          key={token.symbol}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.05, ease }}
                          whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelectToken(token)}
                          className="card flex w-[140px] shrink-0 flex-col items-center gap-2 !rounded-2xl !px-4 !py-5 text-center transition-all"
                        >
                          <TokenIcon symbol={token.symbol} size={40} />
                          <div>
                            <p className="text-[14px] font-semibold text-[#1D1D1F]">{token.symbol}</p>
                            <p className="mt-0.5 text-[11px] text-[#AEAEB2] tabular">
                              {bal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Live activity */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-7 rounded-2xl bg-[#F8F8FA] px-4 py-3.5"
              >
                <LiveFeed />
              </motion.div>

              {/* How it works — minimal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-auto pb-8 pt-8"
              >
                <div className="flex items-center justify-between gap-4">
                  {[
                    { num: "1", text: "Pick token" },
                    { num: "2", text: "We find yield" },
                    { num: "3", text: "One tap" },
                    { num: "4", text: "Earn 24/7" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      className="flex flex-col items-center gap-1.5 text-center"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0F0F2] text-[10px] font-bold text-[#6E6E73]">
                        {s.num}
                      </div>
                      <p className="text-[10px] font-medium text-[#AEAEB2]">{s.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              DEPOSIT — The Flow
              ════════════════════════════════════ */}
          {view === "deposit" && selectedToken && (
            <motion.div
              key="d"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col pt-6"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  navigateTo("savings");
                  depositor.reset();
                }}
                className="mb-5 min-h-[44px] self-start rounded-lg px-2 py-1 text-[14px] font-medium text-[#34C759] transition-colors hover:bg-[#34C759]/5 active:scale-[0.97]"
              >
                &larr; Back
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[28px] font-semibold tracking-[-0.02em] text-[#1D1D1F]"
              >
                Earn on {selectedToken.symbol}
              </motion.h1>
              <p className="mt-1 text-[13px] text-[#AEAEB2]">
                Balance:{" "}
                {parseFloat(selectedToken.balance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                {selectedToken.symbol}
              </p>

              {/* Amount input — Apple Pay style */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ease }}
                className="card mt-6 p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-[#6E6E73]">
                    Amount
                  </p>
                  <button
                    onClick={() =>
                      setDepositAmount(
                        parseFloat(selectedToken.balance).toFixed(4)
                      )
                    }
                    className="min-h-[44px] rounded-md px-2 py-0.5 text-[12px] font-medium text-[#34C759] transition-colors hover:bg-[#34C759]/5"
                  >
                    Max
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <TokenIcon symbol={selectedToken.symbol} size={48} />
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="min-w-0 flex-1 border-0 bg-transparent text-[42px] font-extralight tracking-[-0.03em] text-[#1D1D1F] placeholder:text-[#E8E8EC] focus:outline-none tabular sm:text-[48px]"
                  />
                  <div className="shrink-0 rounded-full bg-[#F0F0F2] px-3 py-2">
                    <span className="text-[14px] font-semibold text-[#1D1D1F]">
                      {selectedToken.symbol}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Finding vault */}
              {isFindingVault && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F8F8FA] p-4"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-[#34C759]" />
                  <p className="text-[13px] text-[#6E6E73]">
                    Finding best yield...
                  </p>
                </motion.div>
              )}

              {/* Vault card — spring physics from right */}
              {vault && !isFindingVault && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="mt-4"
                >
                  <div className="card overflow-hidden">
                    <div className="bg-gradient-to-r from-[#34C759]/5 to-transparent p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10">
                            <TrendingUp className="h-5 w-5 text-[#34C759]" />
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold text-[#1D1D1F]">
                              {vault.protocol}
                            </p>
                            <p className="text-[12px] text-[#6E6E73]">
                              {vault.network}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[24px] font-extralight text-[#34C759] tabular">
                            {vault.apy.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-[#AEAEB2]">APY</p>
                        </div>
                      </div>
                      {vault.safety && (
                        <div className="mt-3 flex items-center gap-2">
                          <div
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                              vault.safety.score >= 4
                                ? "bg-[#34C759]/10 text-[#34C759] shimmer-badge"
                                : "bg-[#F0F0F2] text-[#6E6E73]"
                            }`}
                          >
                            <Shield className="h-2.5 w-2.5" />
                            {vault.safety.label}
                          </div>
                          <span className="text-[10px] text-[#AEAEB2]">
                            {vault.safety.tvlFormatted} TVL
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alternatives — horizontal scroll */}
                  {alternatives.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-[11px] font-medium text-[#AEAEB2]">
                        Also available
                      </p>
                      <div className="scroll-snap-x -mx-1 flex gap-2 px-1 pb-1">
                        {alternatives.map((a, i) => (
                          <motion.button
                            key={`${a.protocol}-${i}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() =>
                              setVault({
                                ...a,
                                token: vault.token,
                                safety: undefined,
                              })
                            }
                            className="flex min-h-[44px] shrink-0 items-center gap-3 rounded-2xl bg-[#F8F8FA] px-4 py-3 transition-colors hover:bg-[#F0F0F2]"
                          >
                            <div className="text-left">
                              <p className="text-[13px] font-medium text-[#1D1D1F]">
                                {a.protocol}
                              </p>
                              <p className="text-[10px] text-[#AEAEB2]">
                                {a.network}
                              </p>
                            </div>
                            <p className="text-[14px] font-semibold text-[#34C759] tabular">
                              {a.apy.toFixed(2)}%
                            </p>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Projected earnings */}
              {projMonthly > 0 && selectedToken && (
                <motion.div
                  key={`proj-${vault?.apy}-${depositAmount}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-2xl bg-[#F8F8FA] p-4"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] text-[#AEAEB2]">Monthly</p>
                      <p className="text-[15px] font-semibold text-[#1D1D1F] tabular">
                        +{projMonthly.toFixed(2)} {selectedToken.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#AEAEB2]">Yearly</p>
                      <p className="text-[15px] font-semibold text-[#1D1D1F] tabular">
                        +{projYearly.toFixed(2)} {selectedToken.symbol}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {depositor.error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-[13px] text-red-600">{depositor.error}</p>
                </motion.div>
              )}

              {/* Deposit status */}
              {depositor.status !== "idle" &&
                depositor.status !== "error" &&
                depositor.status !== "success" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center gap-3 rounded-2xl bg-[#34C759]/5 p-4"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-[#34C759]" />
                    <p className="text-[13px] font-medium text-[#34C759]">
                      {depositor.statusMessage}
                    </p>
                  </motion.div>
                )}

              {/* Start Earning button — shimmer on hover */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeposit}
                  disabled={
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0 ||
                    !vault ||
                    isFindingVault ||
                    (depositor.status !== "idle" &&
                      depositor.status !== "error")
                  }
                  className="btn-primary w-full gap-2"
                >
                  {depositor.status !== "idle" &&
                  depositor.status !== "error" &&
                  depositor.status !== "success" ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      {depositor.statusMessage}
                    </>
                  ) : (
                    <>
                      Start Earning {vault ? `${vault.apy.toFixed(1)}%` : ""}
                      <ArrowRight className="h-[18px] w-[18px]" />
                    </>
                  )}
                </motion.button>
                <p className="mt-3 text-center text-[11px] text-[#AEAEB2]">
                  Cross-chain via LI.FI Composer &middot; One transaction
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              EARNING — The Dopamine Machine
              ════════════════════════════════════ */}
          {view === "earning" && vault && (
            <motion.div
              key="e"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-center"
            >
              {/* Organic particles with trails */}
              <ParticleField count={16} variant="organic" />

              {/* Glow icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-8"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(52,199,89,0)",
                      "0 0 50px 4px rgba(52,199,89,0.15)",
                      "0 0 0 0 rgba(52,199,89,0)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#34C759]/10"
                >
                  <Sparkles className="h-7 w-7 text-[#34C759]" />
                </motion.div>
              </motion.div>

              <EarningScreen
                principal={earningAmount}
                apy={earningApy}
                protocol={vault.protocol}
                network={vault.network}
                onMilestone={(m) => {
                  setCurrentMilestone(m);
                  setShowMilestone(true);
                  setTimeout(() => setShowMilestone(false), 2500);
                }}
              />

              {depositor.result?.txHash && (
                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  href={
                    depositor.result.explorerUrl ??
                    `https://etherscan.io/tx/${depositor.result.txHash}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 text-[11px] text-[#AEAEB2] underline decoration-[#E8E8EC] underline-offset-2 transition-colors hover:text-[#6E6E73]"
                >
                  View transaction
                </motion.a>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-6 max-w-[280px] text-center text-[12px] leading-relaxed text-[#AEAEB2]"
              >
                Yield accrues on-chain 24/7. Withdraw or shift anytime.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="mt-8 flex gap-3"
              >
                <button
                  onClick={() => navigateTo("savings")}
                  className="btn-secondary gap-2 px-6 text-[14px] active:scale-[0.97]"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Withdraw
                </button>
                <button
                  onClick={() => {
                    navigateTo("deposit");
                    setDepositAmount("");
                    depositor.reset();
                  }}
                  className="btn-primary gap-2 px-6 text-[14px]"
                >
                  Add More
                </button>
              </motion.div>

              {/* Social elements */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
                className="mt-10 w-full max-w-sm space-y-5"
              >
                <Leaderboard userRank={47} />
                <LiveFeed />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-8 text-[10px] text-[#AEAEB2]"
              >
                Powered by LI.FI Earn + Composer
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Milestone celebration overlay */}
        <MilestoneCelebration milestone={currentMilestone} isVisible={showMilestone} />
      </div>
    </div>
  );
}
