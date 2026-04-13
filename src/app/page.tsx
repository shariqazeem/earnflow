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
  Loader2,
  Sparkles,
  AlertCircle,
  Zap,
  ArrowRightLeft,
  ExternalLink,
  RefreshCw,
  Check,
  ChevronDown,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTokenBalances, type TokenInfo } from "@/hooks/useTokenBalances";
import { useDeposit } from "@/hooks/useDeposit";
import { useWithdraw } from "@/hooks/useWithdraw";
import { useYieldCounter } from "@/hooks/useYieldCounter";
import { useSound } from "@/hooks/useSound";
import { LiveFeed } from "@/components/LiveFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { MilestoneCelebration } from "@/components/MilestoneCelebration";
import { RoutePipeline, type RouteStep } from "@/components/RoutePipeline";

/* ─── Constants ─── */
const ease = [0.25, 0.1, 0.25, 1] as const;
const springSnappy = { type: "spring" as const, stiffness: 400, damping: 30 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 25 };

type View = "welcome" | "savings" | "deposit" | "earning" | "withdraw";
const VIEW_ORDER: View[] = [
  "welcome",
  "savings",
  "deposit",
  "earning",
  "withdraw",
];

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

interface ShiftOpportunity {
  vault: VaultInfo;
  improvement: {
    fromApy: number;
    toApy: number;
    delta: number;
    extraYearlyPer1000: number;
  };
}

interface Position {
  vault: string;
  vaultAddress: string;
  protocol: string;
  chain: string;
  balance: string;
  balanceUsd: number;
  apy: number;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  isRedeemable: boolean;
}

interface TopYield {
  token: string;
  protocol: string;
  network: string;
  chainId: number;
  apy: number;
  tvl: string;
  trusted: boolean;
  vaultAddress: string;
}

/* ─── Branded Token Icons ─── */
const TOKEN_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  WETH: "#627EEA",
  USDC: "#2775CA",
  "USDC.E": "#2775CA",
  USDT: "#26A17B",
  DAI: "#F5AC37",
  SDAI: "#F5AC37",
  MATIC: "#8247E5",
  POL: "#8247E5",
  AVAX: "#E84142",
  BNB: "#F3BA2F",
  OP: "#FF0420",
  ARB: "#12AAFF",
  WSTETH: "#00A3FF",
  WBTC: "#F7931A",
  GHO: "#B064E0",
  CBETH: "#0052FF",
};

function TokenIcon({
  symbol,
  size = 44,
}: {
  symbol: string;
  size?: number;
}) {
  const s = symbol?.toUpperCase() ?? "";
  const color = TOKEN_COLORS[s] ?? "#6E6E73";
  const glyph =
    s === "ETH" || s === "WETH" || s === "WSTETH" || s === "CBETH"
      ? "Ξ"
      : s === "USDC" ||
          s === "USDC.E" ||
          s === "USDT" ||
          s === "DAI" ||
          s === "SDAI" ||
          s === "GHO"
        ? "$"
        : s === "WBTC"
          ? "₿"
          : (s[0] ?? "?");
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        boxShadow: `0 2px 12px ${color}12`,
      }}
    >
      <span
        className="font-bold leading-none"
        style={{ color, fontSize: size * 0.38 }}
      >
        {glyph}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CINEMATIC COMPONENTS
   ═══════════════════════════════════════════════════ */

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
      transition: { staggerChildren: 0.06, delayChildren: delay },
    },
  };
  const child = {
    hidden: { opacity: 0, y: 20, filter: "blur(16px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease },
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

function FloatingAmount() {
  const mv = useMotionValue(12847.23);
  const display = useTransform(
    mv,
    (v) =>
      `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    const id = setInterval(
      () => mv.set(mv.get() + Math.random() * 0.015),
      150
    );
    return () => clearInterval(id);
  }, [mv]);

  return (
    <motion.div
      className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2 select-none whitespace-nowrap"
      animate={{ y: [-8, 8, -8] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.span className="text-[80px] font-extralight tracking-[-0.04em] text-[#1D1D1F]/[0.045] tabular sm:text-[100px]">
        {display}
      </motion.span>
    </motion.div>
  );
}

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
            ? 1.5 + Math.random() * 5
            : 1 + Math.random() * 2.5,
        duration: 5 + Math.random() * 9,
        delay: Math.random() * 6,
        opacity:
          variant === "organic"
            ? 0.15 + Math.random() * 0.4
            : 0.08 + Math.random() * 0.18,
        hasTrail: variant === "organic" && Math.random() > 0.4,
        trailH: 16 + Math.random() * 30,
        drift: (Math.random() - 0.5) * 30,
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
          initial={{ y: "110vh", opacity: 0, x: 0 }}
          animate={{
            y: "-10vh",
            opacity: [0, p.opacity, p.opacity, 0],
            x: p.drift,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background:
                variant === "organic"
                  ? `radial-gradient(circle, rgba(52,199,89,0.6) 0%, rgba(52,199,89,0.1) 100%)`
                  : "#34C759",
            }}
          />
          {p.hasTrail && (
            <div
              className="absolute left-1/2 top-full w-px -translate-x-1/2 bg-gradient-to-b from-[#34C759]/25 to-transparent"
              style={{ height: p.trailH }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

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
    (v) =>
      `0 4px 20px rgba(52,199,89,${0.15 + v * 0.3}), 0 8px 40px rgba(52,199,89,${v * 0.2})`
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
        animate(x, 0, { duration: 0.5 });
        animate(y, 0, { duration: 0.5 });
        animate(glow, 0, { duration: 0.5 });
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function KineticBalance({
  value,
  prefix = "$",
  className = "",
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) =>
    v === 0
      ? `${prefix}0.00`
      : `${prefix}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    const c = animate(mv, value, { duration: 1.4, ease });
    return c.stop;
  }, [value, mv]);

  return (
    <motion.span className={`hero-number ${className}`}>{display}</motion.span>
  );
}

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
    <div className="flex justify-center gap-12">
      {bars.map((b, i) => (
        <motion.div
          key={b.label}
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 + i * 0.12 }}
        >
          <div className="relative h-16 w-8 overflow-hidden rounded-full bg-[#F0F0F2]">
            <motion.div
              className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-[#34C759]/30 to-[#34C759]/10"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(b.pct, 12)}%` }}
              transition={{ delay: 1.1 + i * 0.15, duration: 1, ease }}
            />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AEAEB2]">
            {b.label}
          </p>
          <p className="text-[15px] font-semibold text-[#1D1D1F] tabular">
            +${b.value < 0.01 ? b.value.toFixed(4) : b.value.toFixed(2)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Earning Screen — The Dopamine Machine ─── */
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
    <div className="relative text-center">
      {/* Ambient glow behind the number */}
      <div className="earning-glow" />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="section-label"
      >
        Your Savings
      </motion.p>

      <motion.p
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.15, duration: 0.8, ease }}
        className="hero-number counter-glow mt-4"
      >
        $
        {total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: total > 100 ? 2 : 6,
        })}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="yield-badge mx-auto mt-5"
      >
        <div className="relative h-2.5 w-2.5">
          <motion.div
            animate={{ scale: [1, 1.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-[#34C759]"
          />
          <div className="live-dot absolute inset-0 rounded-full" />
        </div>
        <span className="text-[15px] font-semibold text-[#34C759] tabular">
          +${earned < 0.01 ? earned.toFixed(6) : earned.toFixed(4)}
        </span>
        <span className="text-[12px] text-[#34C759]/60">earned</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mx-auto mt-4 flex max-w-[300px] items-center justify-center gap-2 rounded-full bg-[#F0F0F2] px-4 py-2.5"
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
        className="mt-10"
      >
        <p className="section-label mb-4">Projected Earnings</p>
        <ProjectionBars perDay={perDay} perMonth={perMonth} perYear={perYear} />
      </motion.div>
    </div>
  );
}

/* ─── Shift Card — Premium dark card ─── */
function ShiftCard({
  shift,
  onShift,
  isLoading,
}: {
  shift: ShiftOpportunity;
  onShift: () => void;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springGentle}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D1D1F] to-[#2D2D30]"
    >
      <div className="shift-glow absolute inset-0 rounded-3xl opacity-30" />
      <div className="relative p-6">
        <div className="mb-4 flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#34C759]/20"
          >
            <Zap className="h-5 w-5 text-[#34C759]" />
          </motion.div>
          <div>
            <p className="text-[14px] font-semibold text-white">
              Better Rate Found
            </p>
            <p className="text-[11px] text-white/40">
              Cross-chain yield migration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-2xl bg-white/[0.06] p-4 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Current
            </p>
            <p className="mt-1 text-[24px] font-extralight text-white/50 tabular">
              {shift.improvement.fromApy.toFixed(2)}%
            </p>
          </div>
          <motion.div
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="h-5 w-5 text-[#34C759]" />
          </motion.div>
          <div className="flex-1 rounded-2xl bg-[#34C759]/10 p-4 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#34C759]/50">
              New
            </p>
            <p className="mt-1 text-[24px] font-extralight text-[#34C759] tabular">
              {shift.improvement.toApy.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/35">
              {shift.vault.protocol} · {shift.vault.network}
            </p>
            <p className="text-[12px] font-medium text-[#34C759]/70">
              +${shift.improvement.extraYearlyPer1000.toFixed(0)}/yr per $1,000
            </p>
          </div>
          {shift.vault.safety && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5">
              <Shield className="h-3 w-3 text-white/40" />
              <span className="text-[10px] text-white/40">
                {shift.vault.safety.label}
              </span>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onShift}
          disabled={isLoading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34C759] py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#2DB84D] disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Shifting...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4" />
              Shift to {shift.improvement.toApy.toFixed(1)}% APY
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ═══ VIEW TRANSITIONS ═══ */

const slideVariants = {
  enter: (d: number) => ({
    x: d > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.97,
    filter: "blur(8px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease },
  },
  exit: (d: number) => ({
    x: d > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.97,
    filter: "blur(8px)",
    transition: { duration: 0.35, ease },
  }),
};

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */

function getChainNameById(id: number): string {
  const names: Record<number, string> = { 1: "Ethereum", 42161: "Arbitrum", 10: "Optimism", 8453: "Base", 137: "Polygon", 56: "BSC", 43114: "Avalanche" };
  return names[id] ?? `Chain ${id}`;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const {
    tokens,
    isLoading: isLoadingTokens,
    chainName,
    chainId: currentChainId,
  } = useTokenBalances();
  const depositor = useDeposit();
  const withdrawer = useWithdraw();
  const { switchChain } = useSwitchChain();
  const SUPPORTED_CHAINS = [1, 42161, 10, 8453, 137, 56, 43114];
  const isTestnet = currentChainId
    ? !SUPPORTED_CHAINS.includes(currentChainId)
    : false;
  const { playDeposit, playSuccess } = useSound();

  const [view, setView] = useState<View>("welcome");
  const [direction, setDirection] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
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
  const [earningProtocol, setEarningProtocol] = useState("");
  const [earningNetwork, setEarningNetwork] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);

  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [shiftOpportunities, setShiftOpportunities] = useState<
    ShiftOpportunity[]
  >([]);
  const [isShifting] = useState(false);
  const [topYields, setTopYields] = useState<TopYield[]>([]);
  const [topYieldsScanned, setTopYieldsScanned] = useState(0);

  const isDisconnecting = useRef(false);

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
    if (isDisconnecting.current) return;
    if (isConnected && view === "welcome") navigateTo("savings");
    if (!isConnected && view !== "welcome") navigateTo("welcome");
  }, [isConnected, view, navigateTo]);

  // Fetch on-chain positions from LI.FI — works on ANY device with same wallet
  // The blockchain is the source of truth, not localStorage
  useEffect(() => {
    if (!address || !isConnected) return;
    (async () => {
      // 1. Fetch real on-chain positions from LI.FI (reads blockchain, works globally)
      const r = await fetch(`/api/positions?address=${address}`);
      const data = r.ok ? await r.json() : { positions: [] };
      const raw = data.positions ?? data.data ?? [];

      if (raw.length === 0) {
        // No on-chain positions — check localStorage cache for instant display
        try {
          const cached = localStorage.getItem("shift_deposits");
          if (cached) {
            const parsed = JSON.parse(cached) as Position[];
            if (parsed.length > 0) {
              setPositions(parsed);
              const totalUsd = parsed.reduce((s, p) => s + p.balanceUsd, 0);
              if (totalUsd > 0) setEarningAmount(totalUsd);
              if (parsed[0]?.apy) setEarningApy(parsed[0].apy);
            }
          }
        } catch {}
        return;
      }

      // 2. Parse positions from LI.FI
      const apiPositions: Position[] = raw.map((p: Record<string, unknown>) => {
        const asset = p.asset as Record<string, unknown> | undefined;
        const v = p.vault as Record<string, unknown> | undefined;

        if (asset) {
          return {
            vault: String(p.protocolName ?? "Vault"),
            vaultAddress: "",
            protocol: String(p.protocolName ?? "Unknown"),
            chain: getChainNameById(Number(p.chainId ?? 0)),
            balance: String(p.balanceNative ?? "0"),
            balanceUsd: Number(typeof p.balanceUsd === "string" ? parseFloat(p.balanceUsd as string) : (p.balanceUsd ?? 0)),
            apy: 0,
            chainId: Number(p.chainId ?? 0),
            tokenSymbol: String(asset.symbol ?? "USDC"),
            tokenAddress: String(asset.address ?? ""),
            tokenDecimals: Number(asset.decimals ?? 18),
            isRedeemable: false,
          };
        }

        const analytics = v?.analytics as Record<string, unknown> | undefined;
        const apyData = analytics?.apy as Record<string, unknown> | undefined;
        const underlyingTokens = v?.underlyingTokens as { symbol: string; address: string; decimals: number }[] | undefined;
        return {
          vault: (v?.name as string) ?? "Vault",
          vaultAddress: (v?.address as string) ?? "",
          protocol: ((v?.protocol as Record<string, unknown>)?.name as string) ?? "Unknown",
          chain: (v?.network as string) ?? "Unknown",
          balance: String(p.balance ?? "0"),
          balanceUsd: Number(p.balanceUsd ?? 0),
          apy: Number(apyData?.total ?? 0),
          chainId: Number(v?.chainId ?? 0),
          tokenSymbol: underlyingTokens?.[0]?.symbol ?? "USDC",
          tokenAddress: underlyingTokens?.[0]?.address ?? "",
          tokenDecimals: underlyingTokens?.[0]?.decimals ?? 6,
          isRedeemable: Boolean(v?.isRedeemable ?? false),
        };
      });

      // 3. Enrich EVERY position with vault details for withdrawal
      //    This makes withdrawal work on ANY device — we find the vault by protocol+chain+token
      const enriched = await Promise.all(
        apiPositions.map(async (pos) => {
          if (pos.vaultAddress && pos.apy > 0) return pos; // Already complete

          try {
            const params = new URLSearchParams({ token: pos.tokenSymbol });
            if (pos.chainId) params.set("chainId", String(pos.chainId));
            const vr = await fetch(`/api/best-vault?${params}`);
            if (vr.ok) {
              const vd = await vr.json();
              if (vd.vault) {
                return {
                  ...pos,
                  vaultAddress: vd.vault.address ?? pos.vaultAddress,
                  apy: vd.vault.apy ?? pos.apy,
                  protocol: vd.vault.protocol ?? pos.protocol,
                  vault: vd.vault.name ?? pos.vault,
                  isRedeemable: true,
                };
              }
            }
          } catch {}
          return pos;
        })
      );

      setPositions(enriched);
      // Cache for instant loading on next visit
      try { localStorage.setItem("shift_deposits", JSON.stringify(enriched)); } catch {}

      const totalUsd = enriched.reduce((s, p) => s + p.balanceUsd, 0);
      if (totalUsd > 0) setEarningAmount(totalUsd);
      if (enriched[0]?.apy) setEarningApy(enriched[0].apy);
    })().catch(() => {});
  }, [address, isConnected]);

  // Fetch top yields
  useEffect(() => {
    fetch("/api/top-yields")
      .then((r) => (r.ok ? r.json() : { yields: [] }))
      .then((d) => {
        setTopYields(d.yields ?? []);
        setTopYieldsScanned(d.scanned ?? 0);
      })
      .catch(() => {});
  }, []);

  // Fetch shift opportunities
  useEffect(() => {
    if (positions.length === 0) return;
    const p = positions[0];
    if (!p.tokenSymbol || !p.apy) return;

    const params = new URLSearchParams({
      token: p.tokenSymbol,
      currentApy: String(p.apy || earningApy),
      currentProtocol: p.protocol,
      currentChainId: String(p.chainId),
    });

    fetch(`/api/shift?${params}`)
      .then((r) => (r.ok ? r.json() : { shifts: [] }))
      .then((d) => setShiftOpportunities(d.shifts ?? []))
      .catch(() => {});
  }, [positions, earningApy]);

  // Deposit success → earning screen + create local position
  useEffect(() => {
    if (depositor.status === "success") {
      playSuccess();
      setShowFlash(true);
      const rawAmt = parseFloat(depositAmount) || 0;
      // Estimate USD value for non-stablecoin tokens
      const isStable = ["USDC", "USDT", "DAI", "SDAI", "GHO"].includes(
        selectedToken?.symbol.toUpperCase() ?? ""
      );
      const amt = isStable ? rawAmt : rawAmt * 2500; // rough ETH price
      const apyVal = vault?.apy ?? 0;
      const proto = vault?.protocol ?? "";
      const net = vault?.network ?? "";
      const t = setTimeout(() => {
        setShowFlash(false);
        setEarningAmount(amt);
        setEarningApy(apyVal);
        setEarningProtocol(proto);
        setEarningNetwork(net);
        // Create a local position so it shows on dashboard immediately
        if (vault) {
          const localPos: Position = {
            vault: vault.name,
            vaultAddress: vault.address,
            protocol: proto,
            chain: net,
            balance: depositAmount,
            balanceUsd: isStable ? rawAmt : rawAmt * 2500,
            apy: apyVal,
            chainId: vault.chainId,
            tokenSymbol: selectedToken?.symbol ?? "ETH",
            tokenAddress: vault.token?.address ?? "",
            tokenDecimals: vault.token?.decimals ?? 18,
            isRedeemable: true,
          };
          setPositions((prev) => {
            if (prev.some((p) => p.vaultAddress === vault.address)) return prev;
            const updated = [localPos, ...prev];
            try { localStorage.setItem("shift_deposits", JSON.stringify(updated)); } catch {}
            return updated;
          });
          setActivePosition(localPos);
        }
        navigateTo("earning");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [depositor.status, depositAmount, vault, selectedToken, playSuccess, navigateTo]);

  // Withdraw success → savings
  useEffect(() => {
    if (withdrawer.status === "success") {
      playSuccess();
      setShowFlash(true);
      const t = setTimeout(() => {
        setShowFlash(false);
        setEarningAmount(0);
        setEarningApy(0);
        setPositions([]);
        navigateTo("savings");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [withdrawer.status, playSuccess, navigateTo]);

  /* ─── Vault lookup — prefers same chain ─── */
  const findVault = useCallback(async (sym: string) => {
    setIsFindingVault(true);
    try {
      const params = new URLSearchParams({ token: sym });
      if (currentChainId) params.set("chainId", String(currentChainId));
      const r = await fetch(`/api/best-vault?${params}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setVault(d.vault);
      setAlternatives(d.alternatives ?? []);
    } catch {
      setVault(null);
    } finally {
      setIsFindingVault(false);
    }
  }, [currentChainId]);

  // Yield options: parallel quotes for the deposit page
  interface YieldOption {
    vault: VaultInfo;
    quote: { receivedUSD: string; feesUSD: string; receivedAmount: string } | null;
    isLoading: boolean;
    isCrossToken: boolean;
    isSameChain: boolean;
    underlyingToken: string;
  }
  const [yieldOptions, setYieldOptions] = useState<YieldOption[]>([]);
  const [isLoadingYields, setIsLoadingYields] = useState(false);

  const handleSelectToken = useCallback(
    (t: TokenInfo) => {
      setSelectedToken(t);
      setDepositAmount("");
      setYieldOptions([]);
      depositor.reset();
      navigateTo("deposit");
      // Fetch vault candidates (fast — no route verification)
      const sym = t.symbol === "WETH" ? "ETH" : t.symbol;
      const params = new URLSearchParams({ token: sym });
      if (currentChainId) params.set("chainId", String(currentChainId));
      setIsLoadingYields(true);
      fetch(`/api/best-vault?${params}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.candidates) return;
          // Set vault to first candidate for backwards compat
          if (d.vault) {
            setVault(d.vault);
            setAlternatives(d.alternatives ?? []);
          }
          // Create yield options from candidates (quotes fetched when amount entered)
          const opts: YieldOption[] = d.candidates.map((c: VaultInfo & { isCrossToken?: boolean; isSameChain?: boolean; underlyingToken?: string }) => ({
            vault: c,
            quote: null,
            isLoading: false,
            isCrossToken: c.isCrossToken ?? false,
            isSameChain: c.isSameChain ?? false,
            underlyingToken: c.underlyingToken ?? c.token?.symbol ?? "",
          }));
          setYieldOptions(opts);
          setIsLoadingYields(false);
        })
        .catch(() => setIsLoadingYields(false));
    },
    [navigateTo, depositor, currentChainId]
  );

  // Fetch parallel quotes when amount changes
  useEffect(() => {
    if (!depositAmount || parseFloat(depositAmount) <= 0 || yieldOptions.length === 0 || !selectedToken || !address) return;
    const isNative = selectedToken.symbol === "ETH" || selectedToken.address === "0x0000000000000000000000000000000000000000";
    const fromToken = isNative ? "0x0000000000000000000000000000000000000000" : selectedToken.address;
    const amountWei = BigInt(Math.floor(parseFloat(depositAmount) * 10 ** selectedToken.decimals)).toString();

    // Debounce
    const timer = setTimeout(() => {
      setYieldOptions((prev) => prev.map((o) => ({ ...o, isLoading: true, quote: null })));

      yieldOptions.forEach((opt, idx) => {
        const qp = new URLSearchParams({
          fromChain: String(currentChainId || 8453),
          toChain: String(opt.vault.chainId),
          fromToken,
          toToken: opt.vault.address,
          fromAmount: amountWei,
          fromAddress: address,
          slippage: "0.005",
        });
        fetch(`/api/quote?${qp}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((q) => {
            setYieldOptions((prev) => {
              const updated = [...prev];
              if (q?.transactionRequest && q.estimate) {
                const feeCosts = (q.estimate.feeCosts ?? []).reduce((s: number, f: { amountUSD?: string }) => s + parseFloat(f.amountUSD ?? "0"), 0);
                const gasCosts = (q.estimate.gasCosts ?? []).reduce((s: number, g: { amountUSD?: string }) => s + parseFloat(g.amountUSD ?? "0"), 0);
                updated[idx] = {
                  ...updated[idx],
                  isLoading: false,
                  quote: {
                    receivedUSD: q.estimate.toAmountUSD ?? "0",
                    feesUSD: (feeCosts + gasCosts).toFixed(2),
                    receivedAmount: q.estimate.toAmount ?? "0",
                  },
                };
              } else {
                updated[idx] = { ...updated[idx], isLoading: false, quote: null };
              }
              return updated;
            });
          })
          .catch(() => {
            setYieldOptions((prev) => {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], isLoading: false, quote: null };
              return updated;
            });
          });
      });
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositAmount, yieldOptions.length, selectedToken, address, currentChainId]);

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

  const handleWithdraw = useCallback(
    async (pos: Position) => {
      if (!pos.vaultAddress) {
        withdrawer.reset();
        return;
      }
      playDeposit();
      const rawAmount = BigInt(
        Math.floor(parseFloat(pos.balance) * 10 ** 18)
      ).toString();

      await withdrawer.withdraw({
        vaultAddress: pos.vaultAddress,
        vaultChainId: pos.chainId,
        underlyingTokenAddress: pos.tokenAddress,
        amount: rawAmount,
      });
    },
    [withdrawer, playDeposit]
  );

  const handleShift = useCallback(
    (shift: ShiftOpportunity) => {
      setVault(shift.vault);
      setAlternatives([]);
      const matchingToken = tokens.find(
        (t) =>
          t.symbol.toUpperCase() ===
          (shift.vault.token?.symbol ?? "USDC").toUpperCase()
      );
      if (matchingToken) {
        setSelectedToken(matchingToken);
        setDepositAmount("");
      }
      depositor.reset();
      navigateTo("deposit");
    },
    [tokens, navigateTo, depositor]
  );

  // Auto-select token if deposit view but no token selected
  useEffect(() => {
    if (view === "deposit" && !selectedToken && tokens.length > 0) {
      const best = tokens.find((t) => parseFloat(t.balance) > 0.000001) ?? tokens[0];
      if (best) {
        setSelectedToken(best);
        findVault(best.symbol === "WETH" ? "ETH" : best.symbol);
      }
    }
  }, [view, selectedToken, tokens, findVault]);

  // Fee preview
  const isCrossChain = vault && currentChainId ? vault.chainId !== currentChainId : false;

  const sorted = [...tokens].sort(
    (a, b) => parseFloat(b.balance) - parseFloat(a.balance)
  );
  const withBalance = sorted.filter((t) => parseFloat(t.balance) > 0.000001);
  const projMonthly =
    vault && depositAmount && parseFloat(depositAmount) > 0
      ? (parseFloat(depositAmount) * vault.apy) / 100 / 12
      : 0;
  const projYearly =
    vault && depositAmount && parseFloat(depositAmount) > 0
      ? (parseFloat(depositAmount) * vault.apy) / 100
      : 0;

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#FBFBFD]">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="ambient-blob"
          style={{
            top: "-20%",
            right: "-15%",
            width: "70vw",
            height: "70vw",
            background:
              "radial-gradient(circle, rgba(52,199,89,0.035) 0%, transparent 70%)",
          }}
        />
        <div
          className="ambient-blob"
          style={{
            bottom: "-30%",
            left: "-20%",
            width: "60vw",
            height: "60vw",
            background:
              "radial-gradient(circle, rgba(52,199,89,0.025) 0%, transparent 70%)",
            animationDelay: "-12s",
          }}
        />
      </div>

      {/* Success flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none fixed inset-0 z-50 bg-[#34C759]"
          />
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-6">
        {/* ─── Header ─── */}
        {isConnected && view !== "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex items-center justify-between pb-2 pt-5"
          >
            <button
              onClick={() => {
                depositor.reset();
                withdrawer.reset();
                navigateTo("savings");
              }}
              className="flex items-center gap-2.5 transition-transform active:scale-95"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#34C759] to-[#30D158] shadow-[0_2px_8px_rgba(52,199,89,0.3)]">
                <TrendingUp
                  className="h-4.5 w-4.5 text-white"
                  strokeWidth={2}
                />
              </div>
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                Shift
              </span>
            </button>
            <button
              onClick={async () => {
                isDisconnecting.current = true;
                depositor.reset();
                withdrawer.reset();
                navigateTo("welcome");
                try {
                  await disconnectAsync();
                } catch {}
                isDisconnecting.current = false;
              }}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-[#F0F0F2] px-3.5 py-2 text-[12px] font-medium text-[#6E6E73] transition-all hover:bg-[#E8E8EC] active:scale-[0.97]"
            >
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-[#34C759]" />
                <div className="live-dot absolute inset-0 rounded-full" />
              </div>
              {address?.slice(0, 6)}...{address?.slice(-4)}
              <span className="text-[#AEAEB2]">&middot;</span>
              {chainName}
              <LogOut className="ml-0.5 h-3 w-3 text-[#AEAEB2]" />
            </button>
          </motion.div>
        )}

        {/* ─── Views ─── */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ═══════════ WELCOME ═══════════ */}
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
              <ParticleField count={28} />

              {/* Logo */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease }}
                className="relative mb-12"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0px 0px rgba(52,199,89,0)",
                      "0 0 60px 12px rgba(52,199,89,0.2)",
                      "0 0 0px 0px rgba(52,199,89,0)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#34C759] to-[#30D158] shadow-lg"
                >
                  <TrendingUp
                    className="h-12 w-12 text-white"
                    strokeWidth={1.5}
                  />
                </motion.div>
                {/* Subtle ring */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-3 rounded-[36px] border border-[#34C759]/20"
                />
              </motion.div>

              <WordReveal
                lines={["Your savings,", "supercharged."]}
                delay={0.3}
                className="text-center text-[44px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#1D1D1F] sm:text-[56px]"
              />

              <motion.p
                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.7, duration: 0.7, ease }}
                className="mt-6 max-w-[300px] text-center text-[17px] leading-[1.6] text-[#6E6E73]"
              >
                Earn up to 10% APY. Best yield across 20+ protocols, 60+ chains.
                One tap.
              </motion.p>

              {/* Live yield pills */}
              {topYields.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="mt-8 flex gap-2"
                >
                  {topYields.slice(0, 3).map((y, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.95 + i * 0.1 }}
                      className="card-glass flex items-center gap-2 !rounded-full !border-0 px-3.5 py-2"
                    >
                      <TokenIcon symbol={y.token} size={20} />
                      <span className="text-[12px] font-semibold text-[#1D1D1F]">
                        {y.token}
                      </span>
                      <span className="text-[12px] font-bold text-[#34C759] tabular">
                        {y.apy.toFixed(1)}%
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Connect button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6, ease }}
              >
                <MagneticButton
                  onClick={() => connect({ connector: injected() })}
                  className="btn-primary mt-10 gap-2.5 px-10 text-[17px]"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </MagneticButton>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-4 text-[13px] text-[#AEAEB2]"
              >
                MetaMask, Coinbase, Rainbow & more
              </motion.p>

              {/* Bottom stats */}
              <motion.div
                className="mt-16 flex items-center gap-6"
                initial="hidden"
                animate="show"
                variants={{
                  show: {
                    transition: { staggerChildren: 0.08, delayChildren: 1.5 },
                  },
                }}
              >
                {[
                  `${topYieldsScanned || "400+"} vaults`,
                  "20+ protocols",
                  "Powered by LI.FI",
                ].map((s, i, arr) => (
                  <motion.span
                    key={s}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="flex items-center gap-6 text-[11px] font-medium text-[#AEAEB2]"
                  >
                    {s}
                    {i < arr.length - 1 && (
                      <span className="text-[#E8E8EC]">&middot;</span>
                    )}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════ SAVINGS DASHBOARD ═══════════ */}
          {view === "savings" && (
            <motion.div
              key="s"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col pt-2 pb-6"
            >
              {/* ─── Hero Balance Card ─── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease }}
                className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D1D1F] to-[#2A2A2D] p-7"
              >
                {/* Animated gradient overlay */}
                <motion.div
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "linear-gradient(135deg, rgba(52,199,89,0.2) 0%, transparent 40%, rgba(52,199,89,0.15) 60%, transparent 100%)",
                    backgroundSize: "200% 200%",
                  }}
                />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    Total Savings
                  </p>
                  <div className="mt-3">
                    <KineticBalance
                      value={earningAmount}
                      className="!text-white !text-[52px] sm:!text-[64px]"
                    />
                  </div>
                  {earningApy > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#34C759]/15 px-4 py-2"
                    >
                      <div className="relative h-2 w-2">
                        <motion.div
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-[#34C759]"
                        />
                        <div className="live-dot absolute inset-0 rounded-full" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#34C759] tabular">
                        Earning {earningApy.toFixed(2)}% APY
                      </span>
                    </motion.div>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 text-[14px] text-white/35"
                    >
                      Deposit below to start earning
                    </motion.p>
                  )}
                  {/* Quick stats row */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex gap-4"
                  >
                    <div className="flex-1 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                        Positions
                      </p>
                      <p className="mt-0.5 text-[18px] font-semibold text-white tabular">
                        {positions.length}
                      </p>
                    </div>
                    <div className="flex-1 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                        Best APY
                      </p>
                      <p className="mt-0.5 text-[18px] font-semibold text-[#34C759] tabular">
                        {topYields[0]
                          ? `${topYields[0].apy.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex-1 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                        Chains
                      </p>
                      <p className="mt-0.5 text-[18px] font-semibold text-white tabular">
                        60+
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* ─── Active Positions ─── */}
              {positions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-7"
                >
                  <p className="section-label mb-3">Active Positions</p>
                  <div className="space-y-2.5">
                    {positions.map((p, i) => (
                      <motion.div
                        key={`${p.protocol}-${p.chain}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.06, ...springSnappy }}
                        className="card !rounded-2xl !p-5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TokenIcon symbol={p.tokenSymbol} size={44} />
                            <div>
                              <p className="text-[15px] font-semibold text-[#1D1D1F]">
                                {p.protocol}
                              </p>
                              <p className="text-[12px] text-[#AEAEB2]">
                                {p.vault} &middot; {p.chain}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[17px] font-bold text-[#1D1D1F] tabular">
                              $
                              {p.balanceUsd.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            {p.apy > 0 && (
                              <p className="text-[12px] font-semibold text-[#34C759] tabular">
                                {p.apy.toFixed(2)}% APY
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => {
                              setActivePosition(p);
                              setEarningAmount(p.balanceUsd);
                              setEarningApy(p.apy);
                              setEarningProtocol(p.protocol);
                              setEarningNetwork(p.chain);
                              setVault({
                                name: p.vault,
                                address: p.vaultAddress,
                                chainId: p.chainId,
                                network: p.chain,
                                protocol: p.protocol,
                                apy: p.apy,
                                tvl: "",
                                token: {
                                  symbol: p.tokenSymbol,
                                  address: p.tokenAddress,
                                  decimals: p.tokenDecimals,
                                },
                              });
                              navigateTo("earning");
                            }}
                            className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#34C759]/[0.08] text-[13px] font-semibold text-[#34C759] transition-all hover:bg-[#34C759]/15 active:scale-[0.97]"
                          >
                            <Sparkles className="h-4 w-4" />
                            View Earnings
                          </button>
                          {p.isRedeemable && (
                            <button
                              onClick={() => handleWithdraw(p)}
                              disabled={
                                withdrawer.status !== "idle" &&
                                withdrawer.status !== "error" &&
                                withdrawer.status !== "success"
                              }
                              className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#F0F0F2] px-5 text-[13px] font-semibold text-[#6E6E73] transition-all hover:bg-[#E8E8EC] active:scale-[0.97] disabled:opacity-40"
                            >
                              <ArrowUpFromLine className="h-4 w-4" />
                              Withdraw
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {withdrawer.status !== "idle" &&
                    withdrawer.status !== "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-3 rounded-2xl bg-[#34C759]/5 p-4"
                      >
                        {withdrawer.status === "error" ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <p className="text-[13px] text-red-600">
                              {withdrawer.error}
                            </p>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-[#34C759]" />
                            <p className="text-[13px] font-medium text-[#34C759]">
                              {withdrawer.statusMessage}
                            </p>
                          </>
                        )}
                      </motion.div>
                    )}
                </motion.div>
              )}

              {/* ─── Your Tokens — Earn On ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-7"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="section-label">
                    Your Tokens &middot; {chainName}
                  </p>
                  {withBalance.length > 0 && (
                    <span className="text-[11px] font-medium text-[#AEAEB2]">
                      Tap to earn
                    </span>
                  )}
                </div>

                {isTestnet && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 flex items-center justify-between rounded-2xl bg-amber-50 px-5 py-4"
                  >
                    <div>
                      <p className="text-[14px] font-semibold text-amber-900">
                        Switch to mainnet
                      </p>
                      <p className="text-[12px] text-amber-700">
                        Yield is only available on mainnet chains
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await switchChain({ chainId: 1 });
                        } catch {
                          try {
                            const eth = (
                              window as unknown as {
                                ethereum?: {
                                  request: (a: {
                                    method: string;
                                    params: unknown[];
                                  }) => Promise<void>;
                                };
                              }
                            ).ethereum;
                            await eth?.request({
                              method: "wallet_switchEthereumChain",
                              params: [{ chainId: "0x1" }],
                            });
                          } catch {}
                        }
                      }}
                      className="rounded-full bg-amber-900 px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      Switch
                    </button>
                  </motion.div>
                )}

                {isLoadingTokens ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-[72px] !rounded-2xl" />
                    ))}
                  </div>
                ) : withBalance.length === 0 ? (
                  <div className="card py-12 text-center">
                    <motion.div
                      animate={{ y: [-4, 4, -4] }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0F0F2]"
                    >
                      <Wallet className="h-8 w-8 text-[#AEAEB2]" />
                    </motion.div>
                    <p className="text-[16px] font-semibold text-[#1D1D1F]">
                      No tokens found
                    </p>
                    <p className="mx-auto mt-2 max-w-[260px] text-[13px] leading-relaxed text-[#AEAEB2]">
                      Transfer tokens to your wallet on any supported chain to
                      start earning yield
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {withBalance.map((token, i) => {
                      const bal = parseFloat(token.balance);
                      const color = TOKEN_COLORS[token.symbol.toUpperCase()] ?? "#6E6E73";
                      return (
                        <motion.button
                          key={token.symbol}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 + i * 0.05, ...springSnappy }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectToken(token)}
                          className="card group flex w-full items-center gap-4 !rounded-2xl !p-4 text-left transition-all"
                        >
                          <TokenIcon symbol={token.symbol} size={48} />
                          <div className="flex-1">
                            <p className="text-[16px] font-semibold text-[#1D1D1F]">
                              {token.symbol}
                            </p>
                            <p className="text-[13px] text-[#AEAEB2] tabular">
                              {bal.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {token.symbol}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#34C759] opacity-0 transition-all group-hover:opacity-100">
                              Earn
                            </span>
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-full transition-all group-hover:scale-105"
                              style={{ background: `${color}12` }}
                            >
                              <ArrowRight
                                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                style={{ color }}
                              />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* ─── Top Yields — Live Rates ─── */}
              {topYields.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="section-label">Top Yields &middot; Live</p>
                    <div className="flex items-center gap-1.5">
                      <div className="relative h-2 w-2">
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-[#34C759]"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#AEAEB2]">
                        {topYieldsScanned} vaults scanned
                      </span>
                    </div>
                  </div>
                  <div className="card overflow-hidden !rounded-2xl !p-0">
                    {topYields.map((y, i) => (
                      <motion.div
                        key={`${y.protocol}-${y.token}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#F8F8FA] ${
                          i < topYields.length - 1
                            ? "border-b border-[#F0F0F2]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="relative">
                            <TokenIcon symbol={y.token} size={40} />
                            {y.trusted && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#34C759] ring-2 ring-white">
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold text-[#1D1D1F]">
                              {y.token}
                            </p>
                            <p className="text-[12px] text-[#AEAEB2]">
                              {y.protocol} &middot; {y.network}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[18px] font-bold text-[#34C759] tabular">
                            {y.apy.toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-[#AEAEB2]">
                            {y.tvl} TVL
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── Shift Feature Teaser ─── */}
              {positions.length === 0 && topYields.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <p className="section-label mb-3">
                    <Zap className="mr-1 inline h-3 w-3" />
                    Shift — Auto Rate Migration
                  </p>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1D1D1F] to-[#2D2D30] p-5">
                    <div className="shift-glow absolute inset-0 opacity-20" />
                    <div className="relative">
                      <p className="text-[14px] font-semibold text-white">
                        Always earning the best rate
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
                        When a better vault appears across any chain, Shift
                        migrates your funds in one tap — cross-chain, automatic.
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2.5 text-center">
                          <p className="text-[10px] text-white/30">Example</p>
                          <p className="text-[16px] font-light text-white/50 tabular">
                            {topYields[1]?.apy.toFixed(1)}%
                          </p>
                        </div>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="h-4 w-4 text-[#34C759]" />
                        </motion.div>
                        <div className="flex-1 rounded-xl bg-[#34C759]/10 px-3 py-2.5 text-center">
                          <p className="text-[10px] text-[#34C759]/50">Better</p>
                          <p className="text-[16px] font-light text-[#34C759] tabular">
                            {topYields[0]?.apy.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3 w-3 text-white/25" />
                        <p className="text-[11px] text-white/25">
                          Powered by LI.FI Composer cross-chain routing
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Live Activity ─── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-8 rounded-2xl bg-[#F8F8FA] px-5 py-4"
              >
                <LiveFeed />
              </motion.div>

              {/* ─── How it works ─── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="safe-bottom mt-10"
              >
                <div className="divider mb-7" />
                <p className="section-label mb-5 text-center">How Shift works</p>
                <div className="flex items-start justify-between gap-2">
                  {[
                    { icon: "1", label: "Pick token", sub: "From your wallet" },
                    { icon: "2", label: "We find yield", sub: "Best APY, scored" },
                    { icon: "3", label: "One tap", sub: "Cross-chain deposit" },
                    { icon: "4", label: "Earn 24/7", sub: "Watch it grow" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className="flex flex-1 flex-col items-center gap-2 text-center"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0F0F2] text-[13px] font-bold text-[#1D1D1F]">
                        {s.icon}
                      </div>
                      <p className="text-[11px] font-semibold text-[#1D1D1F]">
                        {s.label}
                      </p>
                      <p className="text-[10px] text-[#AEAEB2]">
                        {s.sub}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="h-px w-8 bg-[#E8E8EC]" />
                  <p className="text-[11px] font-semibold text-[#AEAEB2]">
                    Powered by LI.FI Earn + Composer
                  </p>
                  <div className="h-px w-8 bg-[#E8E8EC]" />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════ DEPOSIT — Quote-First Yield Discovery ═══════════ */}
          {view === "deposit" && selectedToken && (
            <motion.div
              key="d"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col pt-4 pb-6"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => { navigateTo("savings"); depositor.reset(); }}
                className="mb-5 min-h-[44px] self-start rounded-xl px-3 py-2 text-[15px] font-medium text-[#34C759] transition-all hover:bg-[#34C759]/5 active:scale-[0.97]"
              >
                &larr; Back
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[32px] font-semibold tracking-[-0.03em] text-[#1D1D1F]"
              >
                Earn on {selectedToken.symbol}
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-1 text-[14px] text-[#AEAEB2]">
                Balance: <span className="tabular font-medium text-[#6E6E73]">{parseFloat(selectedToken.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedToken.symbol}</span>
              </motion.p>

              {/* Amount input */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ...springGentle }} className="card mt-6 !p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-[#6E6E73]">Amount</p>
                  <button onClick={() => setDepositAmount(parseFloat(selectedToken.balance).toFixed(4))} className="min-h-[44px] rounded-lg px-3 py-1 text-[13px] font-semibold text-[#34C759] transition-all hover:bg-[#34C759]/5">Max</button>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <TokenIcon symbol={selectedToken.symbol} size={52} />
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0" autoFocus className="input-premium min-w-0 flex-1 border-0 bg-transparent text-[44px] font-extralight tracking-[-0.03em] text-[#1D1D1F] placeholder:text-[#E8E8EC] tabular sm:text-[52px]" />
                </div>
              </motion.div>

              {/* Yield Options — the money maker */}
              {isLoadingYields && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8F8FA] p-5">
                  <Loader2 className="h-5 w-5 animate-spin text-[#34C759]" />
                  <div>
                    <p className="text-[14px] font-medium text-[#1D1D1F]">Finding best yields...</p>
                    <p className="text-[12px] text-[#AEAEB2]">Scanning vaults across all chains + tokens</p>
                  </div>
                </motion.div>
              )}

              {yieldOptions.length > 0 && !isLoadingYields && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-5 -mx-6">
                  <p className="section-label mb-3 px-6">
                    Yield Options {depositAmount && parseFloat(depositAmount) > 0 ? "· Live Quotes" : ""} <span className="ml-1 text-[10px] font-normal text-[#AEAEB2]">swipe →</span>
                  </p>
                  <div className="scroll-snap-x flex gap-3 px-6 pb-3">
                    {yieldOptions
                      .filter((o) => o.quote !== null || o.isLoading || !depositAmount || parseFloat(depositAmount) <= 0)
                      .sort((a, b) => {
                        if (a.quote && !b.quote) return -1;
                        if (!a.quote && b.quote) return 1;
                        if (a.quote && b.quote) return parseFloat(b.quote.receivedUSD) - parseFloat(a.quote.receivedUSD);
                        if (a.isSameChain && !b.isSameChain) return -1;
                        if (!a.isSameChain && b.isSameChain) return 1;
                        return b.vault.apy - a.vault.apy;
                      })
                      .map((opt, i) => {
                        const isSelected = vault?.address === opt.vault.address;
                        const hasQuote = !!opt.quote;
                        return (
                          <motion.button
                            key={opt.vault.address}
                            initial={{ opacity: 0, scale: 0.93 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.06, ...springSnappy }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setVault(opt.vault); setAlternatives([]); }}
                            className={`relative w-[280px] shrink-0 overflow-hidden rounded-3xl text-left transition-all ${
                              isSelected
                                ? "bg-gradient-to-br from-[#1D1D1F] to-[#2D2D30] ring-2 ring-[#34C759]"
                                : "card"
                            }`}
                          >
                            <div className="p-5">
                              {/* Header: Protocol + chain */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <TokenIcon symbol={opt.underlyingToken || opt.vault.token?.symbol || selectedToken.symbol} size={36} />
                                  <div>
                                    <p className={`text-[14px] font-semibold ${isSelected ? "text-white" : "text-[#1D1D1F]"}`}>{opt.vault.protocol}</p>
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className={isSelected ? "text-white/40" : "text-[#AEAEB2]"}>{opt.vault.network}</span>
                                      {opt.isCrossToken && (
                                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${isSelected ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-500"}`}>swap</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {opt.isSameChain ? (
                                  <div className={`rounded-full px-2 py-1 text-[9px] font-bold ${isSelected ? "bg-[#34C759]/20 text-[#34C759]" : "bg-[#34C759]/10 text-[#34C759]"}`}>
                                    No fees
                                  </div>
                                ) : (
                                  <div className={`rounded-full px-2 py-1 text-[9px] font-bold ${isSelected ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-500"}`}>
                                    Bridge
                                  </div>
                                )}
                              </div>

                              {/* APY — big and bold */}
                              <div className="mt-4">
                                <p className="text-[36px] font-extralight leading-none tracking-tight text-[#34C759] tabular">
                                  {opt.vault.apy.toFixed(2)}%
                                </p>
                                <p className={`mt-1 text-[11px] font-medium ${isSelected ? "text-white/30" : "text-[#AEAEB2]"}`}>Annual Yield</p>
                              </div>

                              {/* Quote row */}
                              {opt.isLoading && (
                                <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 ${isSelected ? "bg-white/[0.06]" : "bg-[#F8F8FA]"}`}>
                                  <Loader2 className="h-3 w-3 animate-spin text-[#AEAEB2]" />
                                  <span className={`text-[11px] ${isSelected ? "text-white/40" : "text-[#AEAEB2]"}`}>Quoting...</span>
                                </div>
                              )}
                              {hasQuote && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`mt-4 grid grid-cols-3 gap-2 rounded-2xl p-3 ${isSelected ? "bg-white/[0.06]" : "bg-[#F8F8FA]"}`}
                                >
                                  <div>
                                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? "text-white/25" : "text-[#AEAEB2]"}`}>Receive</p>
                                    <p className={`mt-0.5 text-[16px] font-bold tabular ${isSelected ? "text-white" : "text-[#1D1D1F]"}`}>${parseFloat(opt.quote!.receivedUSD).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? "text-white/25" : "text-[#AEAEB2]"}`}>Fees</p>
                                    <p className={`mt-0.5 text-[14px] font-semibold tabular ${isSelected ? "text-white/60" : "text-[#6E6E73]"}`}>${opt.quote!.feesUSD}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? "text-white/25" : "text-[#AEAEB2]"}`}>Safety</p>
                                    <p className={`mt-0.5 text-[11px] font-bold ${opt.vault.safety && opt.vault.safety.score >= 4 ? "text-[#34C759]" : isSelected ? "text-white/60" : "text-[#6E6E73]"}`}>
                                      {opt.vault.safety?.label ?? "Scored"}
                                    </p>
                                  </div>
                                </motion.div>
                              )}

                              {/* TVL footer */}
                              <div className={`mt-3 flex items-center justify-between text-[10px] ${isSelected ? "text-white/25" : "text-[#AEAEB2]"}`}>
                                <span>{opt.vault.safety?.tvlFormatted} TVL</span>
                                {isSelected && <span className="font-semibold text-[#34C759]">Selected ✓</span>}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                  </div>

                  {/* No working routes */}
                  {depositAmount && parseFloat(depositAmount) > 0 && yieldOptions.every((o) => !o.isLoading && !o.quote) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-6 rounded-2xl bg-amber-50 p-4 text-center">
                      <p className="text-[13px] font-medium text-amber-900">No routes available for this amount</p>
                      <p className="mt-1 text-[12px] text-amber-700">Try a larger amount (min ~$2) or a different token</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Error */}
              {depositor.error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-[13px] leading-relaxed text-red-600">{depositor.error}</p>
                </motion.div>
              )}

              {/* Progress */}
              {depositor.status !== "idle" && depositor.status !== "error" && depositor.status !== "success" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-[#34C759]/5 p-5">
                  <Loader2 className="h-5 w-5 animate-spin text-[#34C759]" />
                  <p className="text-[14px] font-medium text-[#34C759]">{depositor.statusMessage}</p>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="safe-bottom mt-auto pt-5">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !vault || (depositor.status !== "idle" && depositor.status !== "error")}
                  className="btn-primary w-full gap-2 text-[17px]"
                >
                  {depositor.status !== "idle" && depositor.status !== "error" && depositor.status !== "success" ? (
                    <><Loader2 className="h-5 w-5 animate-spin" />{depositor.statusMessage}</>
                  ) : (
                    <>Start Earning {vault ? `${vault.apy.toFixed(1)}%` : ""}<ArrowRight className="h-5 w-5" /></>
                  )}
                </motion.button>
                <p className="mt-3 text-center text-[12px] text-[#AEAEB2]">
                  Powered by LI.FI Composer &middot; Swap + Bridge + Deposit in one tx
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════ EARNING — The Dopamine Machine ═══════════ */}
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
              <ParticleField count={20} variant="organic" />

              {/* Sparkle icon */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className="relative mb-10"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(52,199,89,0)",
                      "0 0 60px 8px rgba(52,199,89,0.15)",
                      "0 0 0 0 rgba(52,199,89,0)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34C759]/10"
                >
                  <Sparkles className="h-8 w-8 text-[#34C759]" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-2 rounded-full border border-[#34C759]/15"
                />
              </motion.div>

              <EarningScreen
                principal={earningAmount}
                apy={earningApy}
                protocol={earningProtocol || vault.protocol}
                network={earningNetwork || vault.network}
                onMilestone={(m) => {
                  setCurrentMilestone(m);
                  setShowMilestone(true);
                  setTimeout(() => setShowMilestone(false), 2500);
                }}
              />

              {/* Tx link */}
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
                  className="mt-6 flex items-center gap-1.5 text-[12px] text-[#AEAEB2] underline decoration-[#E8E8EC] underline-offset-2 transition-colors hover:text-[#6E6E73]"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </motion.a>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-6 max-w-[280px] text-center text-[13px] leading-relaxed text-[#AEAEB2]"
              >
                Yield accrues on-chain 24/7. Withdraw or shift to better rates
                anytime.
              </motion.p>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="mt-8 flex gap-3"
              >
                {activePosition?.isRedeemable ? (
                  <button
                    onClick={() => {
                      if (activePosition) handleWithdraw(activePosition);
                    }}
                    disabled={
                      withdrawer.status !== "idle" &&
                      withdrawer.status !== "error" &&
                      withdrawer.status !== "success"
                    }
                    className="btn-secondary gap-2 px-6 text-[15px] active:scale-[0.97]"
                  >
                    {withdrawer.status !== "idle" &&
                    withdrawer.status !== "error" &&
                    withdrawer.status !== "success" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {withdrawer.statusMessage}
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="h-4 w-4" />
                        Withdraw
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => navigateTo("savings")}
                    className="btn-secondary gap-2 px-6 text-[15px] active:scale-[0.97]"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    // Pre-select the token from active position or first available
                    if (!selectedToken) {
                      const sym = activePosition?.tokenSymbol ?? vault?.token?.symbol ?? "ETH";
                      const match = tokens.find(
                        (t) => t.symbol.toUpperCase() === sym.toUpperCase()
                      );
                      if (match) setSelectedToken(match);
                      else if (tokens.length > 0) setSelectedToken(tokens[0]);
                    }
                    setDepositAmount("");
                    depositor.reset();
                    navigateTo("deposit");
                  }}
                  className="btn-primary gap-2 px-6 text-[15px]"
                >
                  Add More
                </button>
              </motion.div>

              {/* Withdraw error */}
              {withdrawer.error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-[13px] text-red-600">
                    {withdrawer.error}
                  </p>
                </motion.div>
              )}

              {/* ═══ SHIFT CARD ═══ */}
              {shiftOpportunities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                  className="mt-10 w-full max-w-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-[#6E6E73]" />
                    <p className="section-label">Shift Opportunity</p>
                  </div>
                  <ShiftCard
                    shift={shiftOpportunities[0]}
                    onShift={() => handleShift(shiftOpportunities[0])}
                    isLoading={isShifting}
                  />
                </motion.div>
              )}

              {/* Social */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
                className="mt-10 w-full max-w-sm space-y-5"
              >
                <Leaderboard userRank={47} />
                <LiveFeed />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2 }}
                className="safe-bottom mt-8 text-[11px] font-medium text-[#AEAEB2]"
              >
                Powered by LI.FI Earn + Composer
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <MilestoneCelebration
          milestone={currentMilestone}
          isVisible={showMilestone}
        />
      </div>
    </div>
  );
}
