"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

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
  source: "bg-[#F0F0F2] text-[#1D1D1F]",
  bridge: "bg-blue-50 text-blue-600",
  swap: "bg-purple-50 text-purple-600",
  deposit: "bg-[#34C759]/10 text-[#34C759]",
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
    <div className="card overflow-hidden !p-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#F0F0F2] px-5 py-3">
        <Zap className="h-3.5 w-3.5 text-[#34C759]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#AEAEB2]">
          Composer Route
        </p>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1 w-1 rounded-full bg-[#34C759]" />
          <span className="text-[10px] text-[#AEAEB2]">LI.FI</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-1">
          {steps.map((step, i) => (
            <motion.div
              key={`${step.type}-${i}`}
              initial={isAnimating ? { opacity: 0, x: -16 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.12,
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <div className="flex items-center gap-3">
                {/* Step icon + connector */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={isAnimating ? { scale: 0 } : {}}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: i * 0.12 + 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${stepColors[step.type]}`}
                  >
                    {stepIcons[step.type]}
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div className="relative my-1 h-5 w-px bg-[#E8E8EC]">
                      {isAnimating && (
                        <motion.div
                          animate={{ y: [0, 20] }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.12 + 0.2,
                            repeat: Infinity,
                            repeatDelay: 1.8,
                          }}
                          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#34C759]"
                          style={{
                            boxShadow: "0 0 6px rgba(52, 199, 89, 0.5)",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1D1D1F]">
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="text-[11px] text-[#AEAEB2]">
                      {step.sublabel}
                    </p>
                  )}
                </div>

                {/* Value */}
                {i === 0 && amount && (
                  <p className="text-[13px] font-semibold text-[#1D1D1F] tabular">
                    {amount} {token}
                  </p>
                )}
                {i === steps.length - 1 && apy && (
                  <span className="rounded-full bg-[#34C759]/10 px-2.5 py-1 text-[11px] font-bold text-[#34C759]">
                    {apy} APY
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
