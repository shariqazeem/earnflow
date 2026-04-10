"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

/**
 * Simulated leaderboard of top earners.
 * Creates competitive dopamine — "I want to be on this list."
 * Slowly shuffles positions to feel alive.
 */

const EARNERS = [
  { name: "whale.stark", earned: "$15,240", rank: 1 },
  { name: "yield_maxi", earned: "$8,120", rank: 2 },
  { name: "defi_chad", earned: "$5,890", rank: 3 },
  { name: "0x7a...3f9", earned: "$3,450", rank: 4 },
  { name: "stablecoin_sam", earned: "$2,100", rank: 5 },
];

const RANK_STYLES = [
  "bg-amber-50 text-amber-700",
  "bg-zinc-100 text-zinc-600",
  "bg-orange-50 text-orange-700",
  "bg-[#F8F8FA] text-[#AEAEB2]",
  "bg-[#F8F8FA] text-[#AEAEB2]",
];

export function Leaderboard({ userRank }: { userRank?: number }) {
  const [earners, setEarners] = useState(EARNERS);

  // Slowly update amounts to feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      setEarners((prev) =>
        prev.map((e) => {
          const base = parseFloat(e.earned.replace(/[$,]/g, ""));
          const delta = Math.random() * 50;
          return {
            ...e,
            earned: `$${(base + delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          };
        })
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#AEAEB2]">
            Top Earners
          </span>
        </div>
        {userRank && (
          <span className="text-[10px] font-medium text-[#34C759]">
            You&apos;re #{userRank}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {earners.map((e, i) => (
          <motion.div
            key={e.name}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex items-center justify-between rounded-xl bg-[#F8F8FA] px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${RANK_STYLES[i]}`}
              >
                {e.rank}
              </span>
              <span className="text-[12px] font-medium text-[#1D1D1F]">
                {e.name}
              </span>
            </div>
            <span className="text-[12px] font-semibold text-[#34C759] tabular">
              {e.earned}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
