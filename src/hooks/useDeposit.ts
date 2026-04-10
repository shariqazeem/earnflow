"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
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
        const isNative = params.token.symbol === "ETH" || params.token.address === "0x0000000000000000000000000000000000000000";
        const fromToken = isNative
          ? "0x0000000000000000000000000000000000000000"
          : params.token.address;

        const amountWei = BigInt(
          Math.floor(parseFloat(params.amount) * 10 ** params.token.decimals)
        ).toString();

        // 1. Get Composer quote
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
        const txRequest = quote.transactionRequest;

        if (!txRequest) {
          throw new Error("No route found. Try a different amount or token.");
        }

        // 2. ERC20 Approval (skip for native ETH)
        if (!isNative) {
          const approvalAddress = quote.estimate?.approvalAddress ?? txRequest.to;
          if (approvalAddress) {
            setStatus("approving");
            setStatusMessage("Approve token spending...");

            try {
              const approveData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [approvalAddress as `0x${string}`, maxUint256],
              });

              const approveTx = await sendTransactionAsync({
                to: params.token.address as `0x${string}`,
                data: approveData,
                chainId,
              });

              // Wait briefly for approval to confirm
              setStatusMessage("Waiting for approval...");
              await new Promise((r) => setTimeout(r, 8000));
            } catch (approveErr) {
              const msg = approveErr instanceof Error ? approveErr.message : "";
              if (msg.includes("User rejected") || msg.includes("user rejected")) {
                throw new Error("Approval cancelled");
              }
              // If approval fails with "already approved" type errors, continue
              console.warn("Approval may have failed, attempting deposit anyway:", approveErr);
            }
          }
        }

        // 3. Send the deposit transaction
        setStatus("sending");
        setStatusMessage("Confirm deposit in your wallet...");

        const txHash = await sendTransactionAsync({
          to: txRequest.to as `0x${string}`,
          data: txRequest.data as `0x${string}`,
          value: BigInt(txRequest.value || "0"),
          chainId: txRequest.chainId ?? chainId,
        });

        // 4. Confirming
        setStatus("confirming");
        setStatusMessage("Transaction sent! Waiting for confirmation...");

        // 5. Track via LI.FI status
        setStatus("tracking");
        setStatusMessage("Routing your deposit...");

        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));

          try {
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
                  explorerUrl: statusData.receiving?.txLink ?? statusData.sending?.txLink,
                });
                setStatus("success");
                return;
              }

              if (statusData.status === "FAILED") {
                throw new Error("Transaction failed on-chain. Funds may have been returned.");
              }

              // Update message based on progress
              if (statusData.substatus === "BRIDGE_NOT_AVAILABLE") {
                setStatusMessage("Waiting for bridge...");
              } else if (statusData.receiving) {
                setStatusMessage("Depositing into vault...");
              } else {
                setStatusMessage("Processing on-chain...");
              }
            }
          } catch (pollErr) {
            // Don't fail on poll errors, keep trying
            console.warn("Status poll error:", pollErr);
          }

          attempts++;
        }

        // Tx was sent successfully even if tracking timed out
        setResult({ txHash });
        setStatus("success");
      } catch (err) {
        console.error("Deposit failed:", err);
        const msg = err instanceof Error ? err.message : "Deposit failed";

        let clean = msg;
        if (msg.includes("User rejected") || msg.includes("user rejected")) {
          clean = "Transaction cancelled";
        } else if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
          clean = "Insufficient balance for this transaction";
        } else if (msg.includes("No route")) {
          clean = "No route available. The vault may not support direct deposits from your chain. Try a different token or switch chains.";
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

  return { deposit, status, statusMessage, error, result, reset };
}
