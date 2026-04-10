"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Simulated live activity feed — shows "other users" depositing.
 * Creates FOMO and social proof that the app is alive.
 * Uses realistic names, amounts, protocols, and chains from LI.FI ecosystem.
 */

const NAMES = [
  "alice.eth", "vitalik.eth", "defi_chad", "0x7a...3f9", "whale.stark",
  "yield_maxi", "0xBe...c41", "stablecoin_sam", "0x3F...d12", "anon",
  "0xAa...b78", "polygon_pro", "arb_enjoyer", "base_builder", "optimist.eth",
  "0x1C...e45", "degen_dave", "0x9D...f23", "usdc_queen", "0x5E...a67",
];

const ACTIONS = [
  { verb: "deposited", amounts: ["500", "1,000", "2,500", "250", "5,000", "750", "100", "10,000"], tokens: ["USDC", "USDT", "DAI"] },
  { verb: "deposited", amounts: ["0.5", "1.0", "2.0", "0.1", "5.0", "0.25"], tokens: ["ETH", "WETH"] },
  { verb: "shifted to", amounts: ["—"], tokens: ["Aave on Base", "Morpho on Ethereum", "Maple on Ethereum", "Euler on Arbitrum", "Compound on Polygon"] },
  { verb: "earned", amounts: ["$12.50", "$3.20", "$47.00", "$1.85", "$156.30", "$0.94"], tokens: ["this week", "today", "this month"] },
];

function generateActivity() {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const amount = action.amounts[Math.floor(Math.random() * action.amounts.length)];
  const token = action.tokens[Math.floor(Math.random() * action.tokens.length)];
  return { name, verb: action.verb, amount, token, id: Date.now() + Math.random() };
}

export function LiveFeed() {
  const [activities, setActivities] = useState<ReturnType<typeof generateActivity>[]>([]);

  useEffect(() => {
    // Initial batch
    setActivities([generateActivity()]);

    const interval = setInterval(() => {
      setActivities((prev) => {
        const next = [generateActivity(), ...prev].slice(0, 3);
        return next;
      });
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-2 flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-1.5 w-1.5 rounded-full bg-[#34C759]"
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#AEAEB2]">
          Live Activity
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {activities.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-1"
          >
            <p className="text-[12px] text-[#6E6E73]">
              <span className="font-medium text-[#1D1D1F]">{a.name}</span>
              {" "}{a.verb}{" "}
              {a.amount !== "—" && <span className="font-semibold text-[#1D1D1F] tabular">{a.amount}</span>}
              {" "}{a.token}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
