"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyPaperBuy,
  applyPaperSell,
  createPaperPortfolio,
  type PaperFill,
  type PaperPortfolio,
  type PaperQuote,
} from "../../packages/core/src";

const STORAGE_KEY = "apegate.paper.v1";

export function usePaperPortfolio() {
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(() =>
    createPaperPortfolio(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let savedPortfolio: PaperPortfolio | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PaperPortfolio;
        if (
          Number.isFinite(parsed.cashSol) &&
          Array.isArray(parsed.positions) &&
          Array.isArray(parsed.fills)
        ) {
          savedPortfolio = parsed;
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    queueMicrotask(() => {
      if (savedPortfolio) setPortfolio(savedPortfolio);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    }
  }, [hydrated, portfolio]);

  const buy = useCallback(
    (quote: PaperQuote): PaperFill => {
      const result = applyPaperBuy(portfolio, quote, Date.now());
      setPortfolio(result.portfolio);
      return result.fill;
    },
    [portfolio],
  );

  const sell = useCallback(
    (quote: PaperQuote): PaperFill => {
      const result = applyPaperSell(portfolio, quote, Date.now());
      setPortfolio(result.portfolio);
      return result.fill;
    },
    [portfolio],
  );

  const reset = useCallback(() => {
    setPortfolio(createPaperPortfolio());
  }, []);

  return { portfolio, hydrated, buy, sell, reset };
}
