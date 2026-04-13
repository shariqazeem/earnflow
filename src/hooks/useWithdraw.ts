"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction, usePublicClient, useSwitchChain } from "wagmi";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";

type WithdrawStatus =
  | "idle"
  | "quoting"
  | "switching-chain"
  | "approving"
  | "waiting-approval"
  | "sending"
  | "confirming"
  | "success"
  | "error";

interface WithdrawResult {
  txHash?: string;
  explorerUrl?: string;
}

export function useWithdraw() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [status, setStatus] = useState<WithdrawStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const withdraw = useCallback(
    async (params: {
      vaultAddress: string;
      vaultChainId: number;
      underlyingTokenAddress: string;
      amount: string;
    }) => {
      if (!address || !chainId) {
        setError("Wallet not connected");
        return;
      }

      setStatus("quoting");
      setError(null);
      setResult(null);
      setStatusMessage("Preparing withdrawal...");

      try {
        // Auto-switch chain if needed
        if (chainId !== params.vaultChainId) {
          setStatus("switching-chain");
          setStatusMessage(`Switching to ${getChainName(params.vaultChainId)}...`);
          try {
            await switchChainAsync({ chainId: params.vaultChainId });
            // Small delay for wallet to stabilize after chain switch
            await new Promise((r) => setTimeout(r, 1500));
          } catch (switchErr) {
            const msg = switchErr instanceof Error ? switchErr.message : "";
            if (msg.includes("User rejected") || msg.includes("user rejected")) {
              throw new Error("Chain switch cancelled");
            }
            // Try fallback via window.ethereum
            try {
              const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params: unknown[] }) => Promise<void> } }).ethereum;
              await eth?.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${params.vaultChainId.toString(16)}` }],
              });
              await new Promise((r) => setTimeout(r, 1500));
            } catch {
              throw new Error(`Please switch your wallet to ${getChainName(params.vaultChainId)} and try again`);
            }
          }
        }

        setStatus("quoting");
        setStatusMessage("Getting withdrawal quote...");

        // Withdrawal: fromToken = vault address, toToken = underlying token
        const quoteParams = new URLSearchParams({
          fromChain: String(params.vaultChainId),
          toChain: String(params.vaultChainId),
          fromToken: params.vaultAddress,
          toToken: params.underlyingTokenAddress,
          fromAmount: params.amount,
          fromAddress: address,
          slippage: "0.005",
        });

        const quoteRes = await fetch(`/api/quote?${quoteParams}`);

        if (!quoteRes.ok) {
          const err = await quoteRes.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? "Failed to get withdrawal quote"
          );
        }

        const quote = await quoteRes.json();
        const txRequest = quote.transactionRequest;

        if (!txRequest) {
          throw new Error("No withdrawal route found.");
        }

        // Approve vault token spending
        const approvalAddress = quote.estimate?.approvalAddress ?? txRequest.to;
        if (approvalAddress) {
          setStatus("approving");
          setStatusMessage("Approve vault token...");

          try {
            const approveData = encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [approvalAddress as `0x${string}`, maxUint256],
            });

            const approveTxHash = await sendTransactionAsync({
              to: params.vaultAddress as `0x${string}`,
              data: approveData,
              chainId: params.vaultChainId,
            });

            setStatus("waiting-approval");
            setStatusMessage("Waiting for approval...");

            if (publicClient) {
              await publicClient.waitForTransactionReceipt({
                hash: approveTxHash as `0x${string}`,
                confirmations: 1,
              });
            } else {
              await new Promise((r) => setTimeout(r, 12000));
            }
          } catch (approveErr) {
            const msg = approveErr instanceof Error ? approveErr.message : "";
            if (msg.includes("User rejected") || msg.includes("user rejected")) {
              throw new Error("Approval cancelled");
            }
            console.warn("Approval may have failed, attempting withdraw anyway:", approveErr);
          }
        }

        // Send withdrawal tx
        setStatus("sending");
        setStatusMessage("Confirm withdrawal in your wallet...");

        const txHash = await sendTransactionAsync({
          to: txRequest.to as `0x${string}`,
          data: txRequest.data as `0x${string}`,
          value: BigInt(txRequest.value || "0"),
          chainId: txRequest.chainId ?? params.vaultChainId,
          ...(txRequest.gasLimit
            ? { gas: BigInt(Math.ceil(Number(txRequest.gasLimit) * 1.3)) }
            : {}),
        });

        setStatus("confirming");
        setStatusMessage("Withdrawal sent! Confirming...");

        if (publicClient) {
          try {
            await publicClient.waitForTransactionReceipt({
              hash: txHash as `0x${string}`,
              confirmations: 1,
            });
          } catch {
            // continue
          }
        }

        setResult({ txHash });
        setStatus("success");
        setStatusMessage("Withdrawal complete!");
      } catch (err) {
        console.error("Withdrawal failed:", err);
        const msg = err instanceof Error ? err.message : "Withdrawal failed";

        let clean = msg;
        if (msg.includes("User rejected") || msg.includes("user rejected")) {
          clean = "Transaction cancelled";
        } else if (msg.includes("insufficient")) {
          clean = "Insufficient balance for withdrawal";
        } else if (msg.includes("No available quotes")) {
          clean = "Withdrawal route not available. Try again in a moment.";
        }

        setError(clean);
        setStatus("error");
      }
    },
    [address, chainId, sendTransactionAsync, publicClient, switchChainAsync]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
    setStatusMessage("");
  }, []);

  return { withdraw, status, statusMessage, error, result, reset };
}

function getChainName(id: number): string {
  const names: Record<number, string> = { 1: "Ethereum", 42161: "Arbitrum", 10: "Optimism", 8453: "Base", 137: "Polygon", 56: "BSC", 43114: "Avalanche" };
  return names[id] ?? `Chain ${id}`;
}
