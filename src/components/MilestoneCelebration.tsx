"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Zap, Star } from "lucide-react";

/**
 * Milestone celebration overlay.
 * When yield crosses $0.01, $0.10, $1.00, $10, $100 —
 * show a brief celebratory animation.
 */

const MILESTONE_CONFIG: Record<number, { label: string; icon: typeof Sparkles; color: string; size: "sm" | "md" | "lg" }> = {
  0.01: { label: "First penny earned!", icon: Sparkles, color: "#34C759", size: "sm" },
  0.1: { label: "10 cents earned!", icon: TrendingUp, color: "#34C759", size: "sm" },
  1: { label: "$1 earned!", icon: Zap, color: "#34C759", size: "md" },
  10: { label: "$10 earned!", icon: Star, color: "#F59E0B", size: "md" },
  100: { label: "$100 earned!", icon: Star, color: "#F59E0B", size: "lg" },
  1000: { label: "$1,000 earned!", icon: Star, color: "#EF4444", size: "lg" },
};

export function MilestoneCelebration({
  milestone,
  isVisible,
}: {
  milestone: number | null;
  isVisible: boolean;
}) {
  if (!milestone || !isVisible) return null;
  const config = MILESTONE_CONFIG[milestone];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="flex flex-col items-center gap-3">
            {/* Burst particles */}
            {Array.from({ length: config.size === "lg" ? 12 : config.size === "md" ? 8 : 5 }).map((_, i) => {
              const angle = (i / (config.size === "lg" ? 12 : config.size === "md" ? 8 : 5)) * Math.PI * 2;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * (config.size === "lg" ? 120 : 80),
                    y: Math.sin(angle) * (config.size === "lg" ? 120 : 80),
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: config.color,
                    boxShadow: `0 0 8px ${config.color}`,
                  }}
                />
              );
            })}

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${config.color}15`,
                boxShadow: `0 0 40px ${config.color}30`,
              }}
            >
              <Icon
                className="h-8 w-8"
                style={{ color: config.color }}
              />
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[16px] font-semibold text-[#1D1D1F]"
            >
              {config.label}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
