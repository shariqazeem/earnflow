"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Simulates real-time yield accrual based on APY.
 * The counter ticks up every 100ms showing fractional earnings.
 */
export function useYieldCounter(
  principal: number,
  apyPercent: number,
  startTime?: number
) {
  const [earned, setEarned] = useState(0);
  const startRef = useRef(startTime ?? Date.now());

  useEffect(() => {
    if (principal <= 0 || apyPercent <= 0) {
      setEarned(0);
      return;
    }

    startRef.current = startTime ?? Date.now();

    // APY per millisecond
    const ratePerMs = apyPercent / 100 / (365.25 * 24 * 60 * 60 * 1000);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const accrued = principal * ratePerMs * elapsed;
      setEarned(accrued);
    }, 100);

    return () => clearInterval(interval);
  }, [principal, apyPercent, startTime]);

  const perSecond = (principal * apyPercent) / 100 / (365.25 * 24 * 60 * 60);
  const perDay = (principal * apyPercent) / 100 / 365.25;
  const perMonth = (principal * apyPercent) / 100 / 12;
  const perYear = (principal * apyPercent) / 100;

  return {
    earned,
    perSecond,
    perDay,
    perMonth,
    perYear,
    total: principal + earned,
  };
}
