"use client";

import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Receipt[];
        queueMicrotask(() => setReceipts(parsed));
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
      if (
        receipts.some(
          (receipt) =>
            receipt.kind === "verdict" &&
            receipt.inputs.factsHash === verdict.factsHash,
        )
      ) {
        return;
      }
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) => {
        if (
          current.some(
            (item) => item.inputs.factsHash === verdict.factsHash,
          )
        ) {
          return current;
        }
        return [...current, receipt].slice(-100);
      });
    },
    [receipts],
  );

  const addWalletConnect = useCallback(
    async (wallet: string) => {
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) => [...current, receipt].slice(-100));
    },
    [receipts],
  );

  const addPaperFill = useCallback(
    async (fill: PaperFill, quote: PaperQuote) => {
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) => [...current, receipt].slice(-100));
    },
    [receipts],
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
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) =>
        current.some(
          (item) =>
            item.kind === "manual_fill" &&
            item.outputs.signature === signature,
        )
          ? current
          : [...current, receipt].slice(-100),
      );
    },
    [receipts],
  );

  const addPlanChange = useCallback(
    async (planHash: string, name: string, tapeFactsHash: string) => {
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) => [...current, receipt].slice(-100));
    },
    [receipts],
  );

  const addVaultPreview = useCallback(
    async (policyHash: string, ownerWallet: string) => {
      const previous = receipts.at(-1)?.hash ?? null;
      const receipt = await createReceipt({
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
      setReceipts((current) => [...current, receipt].slice(-100));
    },
    [receipts],
  );

  const clear = useCallback(() => setReceipts([]), []);

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
