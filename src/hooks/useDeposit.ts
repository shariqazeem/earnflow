"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import type { TokenInfo } from "./useTokenBalances";

type DepositStatus = "idle" | "quoting" | "approving" | "sending" | "confirming" | "tracking" | "success" | "error";

interface DepositResult {
  txHash?: string;
  explorerUrl?: string;
}

export function useDeposit() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [status, setStatus] = useState<DepositStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const deposit = useCallback(
    async (params: {
      token: TokenInfo;
      amount: string;
      vaultAddress: string;
      vaultChainId: number;
    }) => {
      if (!address || !chainId) {
        setError("Wallet not connected");
        return;
      }

      setStatus("quoting");
      setError(null);
      setResult(null);
      setStatusMessage("Finding the best route...");

      try {
        // 1. Get Composer quote
        const fromToken =
          params.token.symbol === "ETH"
            ? "0x0000000000000000000000000000000000000000"
            : params.token.address;

        const amountWei = BigInt(
          Math.floor(
            parseFloat(params.amount) * 10 ** params.token.decimals
          )
        ).toString();

        const quoteParams = new URLSearchParams({
          fromChain: String(chainId),
          toChain: String(params.vaultChainId),
          fromToken,
          toToken: params.vaultAddress,
          fromAmount: amountWei,
          fromAddress: address,
        });

        const quoteRes = await fetch(`/api/quote?${quoteParams}`);

        if (!quoteRes.ok) {
          const err = await quoteRes.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? "Failed to get quote"
          );
        }

        const quote = await quoteRes.json();

        // 2. Check if we have a transaction to send
        const txRequest = quote.transactionRequest;
        if (!txRequest) {
          throw new Error("No transaction route found. Try a different amount or token.");
        }

        // 3. Send the transaction
        setStatus("sending");
        setStatusMessage("Confirm in your wallet...");

        const txHash = await sendTransactionAsync({
          to: txRequest.to as `0x${string}`,
          data: txRequest.data as `0x${string}`,
          value: BigInt(txRequest.value || "0"),
          chainId: txRequest.chainId,
        });

        setStatus("confirming");
        setStatusMessage("Transaction sent. Waiting for confirmation...");

        // 4. Track status
        setStatus("tracking");
        setStatusMessage("Routing your deposit across chains...");

        // Poll LI.FI status
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));

          const statusParams = new URLSearchParams({
            txHash,
            fromChain: String(chainId),
            toChain: String(params.vaultChainId),
          });

          const statusRes = await fetch(`/api/status?${statusParams}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();

            if (statusData.status === "DONE") {
              setResult({
                txHash,
                explorerUrl: statusData.receiving?.txLink,
              });
              setStatus("success");
              return;
            }

            if (statusData.status === "FAILED") {
              throw new Error("Transaction failed on-chain");
            }

            // Update status message based on substatus
            if (statusData.substatus === "BRIDGE_NOT_AVAILABLE") {
              setStatusMessage("Waiting for bridge...");
            } else if (statusData.receiving) {
              setStatusMessage("Depositing into vault...");
            }
          }

          attempts++;
        }

        // If we get here, treat as success (tx was sent)
        setResult({ txHash });
        setStatus("success");
      } catch (err) {
        console.error("Deposit failed:", err);
        const msg = err instanceof Error ? err.message : "Deposit failed";

        // Clean up common wallet errors
        let clean = msg;
        if (msg.includes("User rejected") || msg.includes("user rejected")) {
          clean = "Transaction cancelled";
        } else if (msg.includes("insufficient funds")) {
          clean = "Insufficient balance for this transaction";
        }

        setError(clean);
        setStatus("error");
      }
    },
    [address, chainId, sendTransactionAsync]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
    setStatusMessage("");
  }, []);

  return {
    deposit,
    status,
    statusMessage,
    error,
    result,
    reset,
  };
}
