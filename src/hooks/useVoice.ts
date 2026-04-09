"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: { results: { isFinal: boolean; [key: number]: { transcript: string } }[]; length?: number }) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(final || interim);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: { error: string }) => {
        setError(event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript("");
    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    error,
  };
}

// Parse natural language commands into structured intents
export interface VoiceIntent {
  action: "find_yield" | "deposit" | "show_positions" | "unknown";
  token?: string;
  amount?: string;
  chain?: string;
}

export function parseVoiceCommand(text: string): VoiceIntent {
  const lower = text.toLowerCase().trim();

  // "find yield for USDC" / "best yield for ETH" / "show me USDC vaults"
  const findMatch = lower.match(
    /(?:find|best|show|get|search).*(?:yield|vault|apy|rate).*(?:for|with|in)?\s*(usdc|usdt|eth|dai|weth|wbtc)?/i
  );
  if (findMatch) {
    return {
      action: "find_yield",
      token: findMatch[1]?.toUpperCase(),
    };
  }

  // "deposit 100 USDC" / "put 500 into" / "invest 1000"
  const depositMatch = lower.match(
    /(?:deposit|put|invest|stake|add|send)\s*(\d+(?:\.\d+)?)\s*(usdc|usdt|eth|dai|weth)?/i
  );
  if (depositMatch) {
    return {
      action: "deposit",
      amount: depositMatch[1],
      token: depositMatch[2]?.toUpperCase(),
    };
  }

  // "show my positions" / "my portfolio" / "how's my money"
  if (
    lower.includes("position") ||
    lower.includes("portfolio") ||
    lower.includes("my money") ||
    lower.includes("my balance") ||
    lower.includes("how much")
  ) {
    return { action: "show_positions" };
  }

  // Fallback: if they just say a token name
  const tokenOnly = lower.match(/^(usdc|usdt|eth|dai|weth|wbtc)$/i);
  if (tokenOnly) {
    return { action: "find_yield", token: tokenOnly[1].toUpperCase() };
  }

  return { action: "unknown" };
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
