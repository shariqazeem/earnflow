"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  onToggle: () => void;
  isSupported: boolean;
  transcript?: string;
}

export function VoiceButton({
  isListening,
  onToggle,
  isSupported,
  transcript,
}: VoiceButtonProps) {
  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pulse rings when listening */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-amber-400"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-amber-400"
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors ${
            isListening
              ? "bg-amber-500 text-white shadow-amber-200"
              : "bg-zinc-900 text-white shadow-zinc-200"
          }`}
        >
          {isListening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {isListening && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-[12px] text-zinc-500"
          >
            {transcript || "Listening..."}
          </motion.p>
        )}
        {!isListening && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[11px] text-zinc-400"
          >
            Tap to speak or type below
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
