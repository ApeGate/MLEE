"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const HOLD_DURATION_MS = 900;

export type ManualTradeReviewIntent = {
  side: "BUY" | "SELL";
  symbol: string;
  mint: string;
  wallet: string;
  summary: string;
  facts: Array<{ label: string; value: string }>;
};

export function useManualTradeReview() {
  const [intent, setIntent] = useState<ManualTradeReviewIntent | null>(null);
  const resolver = useRef<((approved: boolean) => void) | null>(null);

  const decide = useCallback((approved: boolean) => {
    resolver.current?.(approved);
    resolver.current = null;
    setIntent(null);
  }, []);

  const requestReview = useCallback((next: ManualTradeReviewIntent) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setIntent(next);
    });
  }, []);

  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );

  return { intent, requestReview, decide };
}

export function ManualTradeReviewDialog({
  intent,
  onDecision,
}: {
  intent: ManualTradeReviewIntent | null;
  onDecision: (approved: boolean) => void;
}) {
  useEffect(() => {
    if (!intent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDecision(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [intent, onDecision]);

  if (!intent) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDecision(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-trade-review-title"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-[1.6rem] border border-[#493a2d] bg-[#0d0b09] shadow-[0_35px_100px_rgb(0_0_0_/_70%)] sm:max-w-lg sm:rounded-[1.6rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#31291f] p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                intent.side === "BUY"
                  ? "border-pass/25 bg-pass/8 text-pass"
                  : "border-block/25 bg-block/8 text-[#ff8f7b]",
              )}
            >
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-signal">
                Decoded transaction review
              </p>
              <h2
                id="manual-trade-review-title"
                className="mt-1 text-xl font-extrabold tracking-[-0.04em]"
              >
                {intent.summary}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDecision(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#31291f] text-[#766f65] hover:text-[#f4efe5]"
            aria-label="Cancel transaction review"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-2 rounded-xl border border-[#272119] bg-[#090806] p-3">
            {intent.facts.map((fact) => (
              <div
                key={fact.label}
                className="grid grid-cols-[0.7fr_1.3fr] gap-3 border-b border-[#211c16] py-2 text-[9px] last:border-0"
              >
                <span className="text-[#6f685f]">{fact.label}</span>
                <span className="break-all text-right font-mono font-bold text-[#ded7cb]">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warn/20 bg-warn/6 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <p className="text-[9px] leading-relaxed text-[#b89a63]">
              Match the mint and amounts in your wallet. Holding below only
              opens the wallet prompt; your wallet still makes the final
              approval and Apegate never receives your key.
            </p>
          </div>

          <HoldToApprove
            side={intent.side}
            onConfirm={() => onDecision(true)}
          />
          <button
            type="button"
            onClick={() => onDecision(false)}
            autoFocus
            className="mt-2 w-full rounded-xl border border-[#31291f] px-4 py-3 text-xs font-bold text-[#91897e] hover:border-[#4b4134] hover:text-[#f4efe5]"
          >
            Cancel · send nothing
          </button>
        </div>
      </section>
    </div>
  );
}

function HoldToApprove({
  side,
  onConfirm,
}: {
  side: "BUY" | "SELL";
  onConfirm: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((reset = true) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
    startedAt.current = null;
    if (reset) setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (timer.current !== null) return;
    startedAt.current = performance.now();
    const tick = () => {
      if (startedAt.current === null) return;
      setProgress(
        Math.min(
          100,
          ((performance.now() - startedAt.current) / HOLD_DURATION_MS) * 100,
        ),
      );
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    timer.current = setTimeout(() => {
      clear(false);
      setProgress(100);
      onConfirm();
    }, HOLD_DURATION_MS);
  }, [clear, onConfirm]);

  useEffect(() => () => clear(false), [clear]);

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        start();
      }}
      onPointerUp={() => clear()}
      onPointerCancel={() => clear()}
      onKeyDown={(event) => {
        if (
          !event.repeat &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          clear();
        }
      }}
      onBlur={() => clear()}
      className={cn(
        "relative mt-4 w-full touch-none overflow-hidden rounded-xl border px-4 py-3.5 text-sm font-extrabold",
        side === "BUY"
          ? "border-pass/35 bg-pass/7 text-pass"
          : "border-block/35 bg-block/7 text-[#ff8f7b]",
      )}
      aria-label={`Hold to approve ${side.toLowerCase()} wallet prompt`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0",
          side === "BUY" ? "bg-pass/20" : "bg-block/20",
        )}
        style={{ width: `${progress}%` }}
      />
      <span className="relative inline-flex items-center gap-2">
        {progress >= 100 ? <Check className="size-4" /> : null}
        Hold to open wallet · 0.9s
      </span>
    </button>
  );
}
