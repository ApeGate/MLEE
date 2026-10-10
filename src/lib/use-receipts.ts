"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createReceipt,
  verifyReceiptChain,
  type GateVerdict,
  type LaunchFacts,
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

  const clear = useCallback(() => setReceipts([]), []);

  return {
    receipts,
    verified,
    addVerdict,
    addWalletConnect,
    clear,
  };
}
