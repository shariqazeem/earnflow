"use client";

import { useCallback, useRef, useEffect } from "react";

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return () => { ctxRef.current?.close().catch(() => {}); };
  }, []);

  const playDeposit = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    // Warm ascending chime — like money going in
    const freqs = [440, 554, 659, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.8);
    });
  }, []);

  const playEarning = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    // Soft ping — subtle "ching" for yield tick milestone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, []);

  const playSuccess = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    // C major chord arpeggio — victory
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + i * 0.06 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 1.5);
    });
  }, []);

  return { playDeposit, playEarning, playSuccess };
}
