"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction, usePublicClient, useSwitchChain } from "wagmi";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import type { TokenInfo } from "./useTokenBalances";

type DepositStatus =
  | "idle"
  | "quoting"
  | "approving"
  | "waiting-approval"
  | "sending"
  | "confirming"
  | "tracking"
  | "success"
  | "error";

interface DepositResult {
  txHash?: string;
  explorerUrl?: string;
}

export function useDeposit() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

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
        const isNative =
          params.token.symbol === "ETH" ||
          params.token.address ===
            "0x0000000000000000000000000000000000000000";
        const fromToken = isNative
          ? "0x0000000000000000000000000000000000000000"
          : params.token.address;

        const amountWei = BigInt(
          Math.floor(
            parseFloat(params.amount) * 10 ** params.token.decimals
          )
        ).toString();

        // 1. Get Composer quote with slippage
        const quoteParams = new URLSearchParams({
          fromChain: String(chainId),
          toChain: String(params.vaultChainId),
          fromToken,
          toToken: params.vaultAddress,
          fromAmount: amountWei,
          fromAddress: address,
          slippage: "0.005",
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
          throw new Error(
            "No route found. Try a different amount or token."
          );
        }

        // 2. ERC20 Approval (skip for native ETH)
        if (!isNative) {
          const approvalAddress =
            quote.estimate?.approvalAddress ?? txRequest.to;
          if (approvalAddress) {
            setStatus("approving");
            setStatusMessage("Approve token spending...");

            try {
              const approveData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [
                  approvalAddress as `0x${string}`,
                  maxUint256,
                ],
              });

              const approveTxHash = await sendTransactionAsync({
                to: params.token.address as `0x${string}`,
                data: approveData,
                chainId,
              });

              // Wait for approval to actually confirm on-chain
              setStatus("waiting-approval");
              setStatusMessage("Waiting for approval confirmation...");

              if (publicClient) {
                await publicClient.waitForTransactionReceipt({
                  hash: approveTxHash as `0x${string}`,
                  confirmations: 1,
                });
              } else {
                await new Promise((r) => setTimeout(r, 12000));
              }
            } catch (approveErr) {
              const msg =
                approveErr instanceof Error
                  ? approveErr.message
                  : "";
              if (
                msg.includes("User rejected") ||
                msg.includes("user rejected")
              ) {
                throw new Error("Approval cancelled");
              }
              console.warn(
                "Approval may have failed, attempting deposit anyway:",
                approveErr
              );
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
          ...(txRequest.gasLimit
            ? {
                gas: BigInt(
                  Math.ceil(Number(txRequest.gasLimit) * 1.3)
                ),
              }
            : {}),
        });

        // 4. Confirming on-chain
        setStatus("confirming");
        setStatusMessage("Transaction sent! Waiting for confirmation...");

        if (publicClient) {
          try {
            await publicClient.waitForTransactionReceipt({
              hash: txHash as `0x${string}`,
              confirmations: 1,
            });
          } catch {
            // Continue to tracking even if receipt polling fails
          }
        }

        // 5. Track via LI.FI status (cross-chain routing)
        const isCrossChain = chainId !== params.vaultChainId;
        if (isCrossChain) {
          setStatus("tracking");
          setStatusMessage("Routing your deposit across chains...");

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

              const statusRes = await fetch(
                `/api/status?${statusParams}`
              );
              if (statusRes.ok) {
                const statusData = await statusRes.json();

                if (statusData.status === "DONE") {
                  setResult({
                    txHash,
                    explorerUrl:
                      statusData.receiving?.txLink ??
                      statusData.sending?.txLink,
                  });
                  setStatus("success");
                  return;
                }

                if (statusData.status === "FAILED") {
                  throw new Error(
                    "Transaction failed on-chain. Funds may have been returned."
                  );
                }

                if (
                  statusData.substatus === "BRIDGE_NOT_AVAILABLE"
                ) {
                  setStatusMessage("Waiting for bridge...");
                } else if (statusData.receiving) {
                  setStatusMessage("Depositing into vault...");
                } else {
                  setStatusMessage("Processing on-chain...");
                }
              }
            } catch (pollErr) {
              if (
                pollErr instanceof Error &&
                pollErr.message.includes("failed on-chain")
              ) {
                throw pollErr;
              }
              console.warn("Status poll error:", pollErr);
            }

            attempts++;
          }
        }

        // Tx was sent and confirmed (or tracking timed out)
        setResult({ txHash, explorerUrl: getExplorerTxUrl(chainId, txHash) });
        setStatus("success");
      } catch (err) {
        console.error("Deposit failed:", err);
        const msg = err instanceof Error ? err.message : "Deposit failed";

        let clean = msg;
        if (
          msg.includes("User rejected") ||
          msg.includes("user rejected")
        ) {
          clean = "Transaction cancelled";
        } else if (
          msg.includes("insufficient funds") ||
          msg.includes("exceeds balance")
        ) {
          clean = "Insufficient balance for this transaction";
        } else if (
          msg.includes("No route") ||
          msg.includes("No available quotes")
        ) {
          clean =
            "No route available for this amount. Try a larger amount (min ~$2) or a different token.";
        } else if (msg.includes("gas")) {
          clean = "Transaction would fail. Try a smaller amount.";
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

  return { deposit, status, statusMessage, error, result, reset };
}

function getExplorerTxUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    42161: "https://arbiscan.io",
    10: "https://optimistic.etherscan.io",
    8453: "https://basescan.org",
    137: "https://polygonscan.com",
    56: "https://bscscan.com",
    43114: "https://snowtrace.io",
  };
  const base = explorers[chainId] ?? "https://etherscan.io";
  return `${base}/tx/${txHash}`;
}
