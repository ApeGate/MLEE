"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createReceipt,
  verifyReceiptChain,
  type GateVerdict,
  type LaunchFacts,
  type PaperFill,
  type PaperQuote,
  type Receipt,
  type Source,
} from "../../packages/core/src";

const STORAGE_KEY = "apegate.receipts.v1";

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [verified, setVerified] = useState(true);
  const receiptsRef = useRef<Receipt[]>([]);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueReceipt = useCallback(
    (
      build: (
        current: readonly Receipt[],
        previous: string | null,
      ) => Promise<Receipt | null>,
    ) => {
      const operation = writeQueueRef.current.then(async () => {
        const current = receiptsRef.current;
        const receipt = await build(current, current.at(-1)?.hash ?? null);
        if (!receipt) return;
        const next = [...current, receipt].slice(-100);
        receiptsRef.current = next;
        setReceipts(next);
      });
      writeQueueRef.current = operation.catch(() => undefined);
      return operation;
    },
    [],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Receipt[];
        queueMicrotask(() => {
          receiptsRef.current = parsed;
          setReceipts(parsed);
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
    void verifyReceiptChain(receipts).then(setVerified);
  }, [receipts]);

  const addVerdict = useCallback(
    async (
      facts: LaunchFacts,
      verdict: GateVerdict,
      source: Extract<Source, "live" | "replay">,
    ) => {
      await enqueueReceipt(async (current, previous) => {
        if (
          current.some(
            (receipt) =>
              receipt.kind === "verdict" &&
              receipt.inputs.factsHash === verdict.factsHash,
          )
        ) {
          return null;
        }
        return createReceipt({
          kind: "verdict",
          actor: "kong",
          subject: { mint: facts.mint },
          at: { ts: verdict.computedAt },
          inputs: {
            factsHash: verdict.factsHash,
            rulesetVersion: verdict.rulesetVersion,
            params: { profile: verdict.profile },
          },
          outputs: {
            verdict: verdict.kind,
            score: verdict.score,
            reasons: verdict.topReasons,
          },
          evidence: verdict.checks.flatMap((check) => check.evidence).slice(0, 12),
          source,
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const addWalletConnect = useCallback(
    async (wallet: string) => {
      await enqueueReceipt(async (_current, previous) => {
        return createReceipt({
          kind: "connect",
          actor: "user",
          subject: { wallet },
          at: { ts: Date.now() },
          inputs: { params: { signing: "manual" } },
          outputs: { connected: true, custody: "user" },
          evidence: [],
          source: "live",
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const addPaperFill = useCallback(
    async (fill: PaperFill, quote: PaperQuote) => {
      await enqueueReceipt(async (_current, previous) => {
        return createReceipt({
          kind: "paper_fill",
          actor: "caesar",
          subject: { mint: fill.mint },
          at: { ts: fill.at },
          inputs: {
            params: {
              side: fill.side,
              model: fill.model,
              slippageBps: quote.slippageBps,
            },
          },
          outputs: {
            symbol: fill.symbol,
            side: fill.side,
            tokens: fill.tokens,
            quoteAmountSol: fill.quoteAmountSol,
            feeSol: fill.feeSol,
            executionPriceSol: fill.executionPriceSol,
            realizedPnlSol: fill.realizedPnlSol,
          },
          evidence: [
            {
              kind: "account",
              ref: fill.mint,
              note: "Paper fill used the selected launch snapshot",
            },
          ],
          source: "paper",
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const addManualFill = useCallback(
    async ({
      mint,
      symbol,
      wallet,
      side,
      amountSol,
      percent,
      signature,
      factsHash,
      slot,
    }: {
      mint: string;
      symbol: string;
      wallet: string;
      side: "BUY" | "SELL";
      amountSol?: number;
      percent?: number;
      signature: string;
      factsHash?: string;
      slot: number | null;
    }) => {
      await enqueueReceipt(async (current, previous) => {
        if (
          current.some(
            (item) =>
              item.kind === "manual_fill" &&
              item.outputs.signature === signature,
          )
        ) {
          return null;
        }
        return createReceipt({
          kind: "manual_fill",
          actor: "caesar",
          subject: { mint, wallet },
          at: { ts: Date.now(), ...(slot === null ? {} : { slot }) },
          inputs: {
            ...(factsHash ? { factsHash } : {}),
            rulesetVersion: "gate-1.2.0",
            params: {
              side,
              ...(amountSol === undefined ? {} : { amountSol }),
              ...(percent === undefined ? {} : { percent }),
              signing: "privy_external_wallet",
            },
          },
          outputs: {
            symbol,
            side,
            ...(amountSol === undefined ? {} : { amountSol }),
            ...(percent === undefined ? {} : { percent }),
            signature,
            confirmed: true,
            confirmationSlot: slot,
            custody: "user",
            apegateFeeBps: 50,
            apegateFeeCharged: false,
            feeNote: "Guarded browser beta waiver",
          },
          evidence: [
            {
              kind: "tx",
              ref: signature,
              note: "Confirmed user-approved Solana transaction",
            },
            {
              kind: "url",
              ref: `https://solscan.io/tx/${signature}`,
              note: "Solscan transaction",
            },
          ],
          source: "live",
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const addPlanChange = useCallback(
    async (planHash: string, name: string, tapeFactsHash: string) => {
      await enqueueReceipt(async (_current, previous) => {
        return createReceipt({
          kind: "plan_change",
          actor: "caesar",
          subject: {},
          at: { ts: Date.now() },
          inputs: {
            params: {
              planHash,
              tapeFactsHash,
              immutable: true,
            },
          },
          outputs: {
            name,
            saved: true,
            executionEnabled: false,
          },
          evidence: [],
          source: "replay",
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const addVaultPreview = useCallback(
    async (policyHash: string, ownerWallet: string) => {
      await enqueueReceipt(async (_current, previous) => {
        return createReceipt({
          kind: "vault_preview",
          actor: "cornelius",
          subject: { wallet: ownerWallet },
          at: { ts: Date.now() },
          inputs: { params: { policyHash, provider: "privy" } },
          outputs: {
            previewed: true,
            executionEnabled: false,
            externalReviewComplete: false,
          },
          evidence: [],
          source: "hypothetical",
          prev: previous,
        });
      });
    },
    [enqueueReceipt],
  );

  const clear = useCallback(() => {
    const operation = writeQueueRef.current.then(() => {
      receiptsRef.current = [];
      setReceipts([]);
    });
    writeQueueRef.current = operation.catch(() => undefined);
  }, []);

  return {
    receipts,
    verified,
    addVerdict,
    addWalletConnect,
    addPaperFill,
    addManualFill,
    addPlanChange,
    addVaultPreview,
    clear,
  };
}
