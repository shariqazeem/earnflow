"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

export interface RouteStep {
  type: "source" | "bridge" | "swap" | "deposit";
  label: string;
  sublabel?: string;
  icon?: string;
  chainName?: string;
}

interface RoutePipelineProps {
  steps: RouteStep[];
  amount?: string;
  token?: string;
  apy?: string;
  isAnimating?: boolean;
}

const stepColors: Record<string, string> = {
  source: "bg-zinc-100 text-zinc-700",
  bridge: "bg-blue-50 text-blue-700 ring-blue-100",
  swap: "bg-purple-50 text-purple-700 ring-purple-100",
  deposit: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const stepIcons: Record<string, string> = {
  source: "💰",
  bridge: "🌉",
  swap: "🔄",
  deposit: "📈",
};

export function RoutePipeline({
  steps,
  amount,
  token,
  apy,
  isAnimating = true,
}: RoutePipelineProps) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          Route Preview
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <motion.div
            key={`${step.type}-${i}`}
            initial={isAnimating ? { opacity: 0, x: -20 } : {}}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-center gap-3">
              {/* Step number + connector */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={isAnimating ? { scale: 0 } : {}}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.15 + 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${stepColors[step.type]}`}
                >
                  {stepIcons[step.type]}
                </motion.div>
                {i < steps.length - 1 && (
                  <div className="relative my-1 h-6 w-px bg-zinc-200">
                    {isAnimating && (
                      <motion.div
                        animate={{ y: [0, 24] }}
                        transition={{
                          duration: 0.8,
                          delay: i * 0.15 + 0.3,
                          repeat: Infinity,
                          repeatDelay: 1.5,
                        }}
                        className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-400"
                        style={{ boxShadow: "0 0 8px rgba(245, 158, 11, 0.6)" }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1">
                <p className="text-[13px] font-medium text-zinc-900">
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="text-[11px] text-zinc-500">{step.sublabel}</p>
                )}
              </div>

              {/* Value on right */}
              {i === 0 && amount && (
                <p className="text-[13px] font-semibold text-zinc-900 tabular">
                  {amount} {token}
                </p>
              )}
              {i === steps.length - 1 && apy && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {apy} APY
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Yield forecast */}
      {apy && amount && (
        <motion.div
          initial={isAnimating ? { opacity: 0, y: 10 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: steps.length * 0.15 + 0.2 }}
          className="mt-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 p-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700">
            Projected Earnings
          </p>
          <div className="mt-2 flex items-baseline gap-4">
            <div>
              <p className="text-[10px] text-amber-600">30 days</p>
              <p className="text-[15px] font-semibold text-zinc-900 tabular">
                +${((parseFloat(amount) * parseFloat(apy) / 100) / 12).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-amber-600">1 year</p>
              <p className="text-[15px] font-semibold text-zinc-900 tabular">
                +${(parseFloat(amount) * parseFloat(apy) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
