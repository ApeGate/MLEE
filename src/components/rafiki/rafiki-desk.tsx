"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Check,
  CircleOff,
  Fingerprint,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  RafikiExplanation,
  Receipt,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";
import { useReceipts } from "@/lib/use-receipts";

type RafikiResponse = {
  mode: "ai" | "deterministic";
  source: "LIVE_AI" | "RECEIPT";
  explanation: RafikiExplanation;
  fallbackReason?: string;
};

export function RafikiDesk({ aiConfigured }: { aiConfigured: boolean }) {
  const { receipts, verified } = useReceipts();
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [question, setQuestion] = useState("Why did this happen?");
  const [response, setResponse] = useState<RafikiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => [...receipts].reverse(), [receipts]);
  const selected =
    ordered.find((receipt) => receipt.hash === selectedHash) ??
    ordered[0] ??
    null;

  async function ask() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetch("/api/rafiki", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt: selected, question }),
      });
      const payload = (await result.json()) as
        | RafikiResponse
        | { error?: string };
      if (!result.ok || !("explanation" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Rafiki could not verify this receipt",
        );
      }
      setResponse(payload);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Rafiki is unavailable",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/apegate-logo.jpg"
                alt=""
                width={38}
                height={38}
                priority
                className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
              />
              <span className="hidden text-sm font-extrabold sm:block">
                APEGATE
              </span>
            </Link>
            <span className="h-5 w-px bg-[#31291f]" />
            <div>
              <p className="text-xs font-bold">Ask Rafiki</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Explain only · receipt facts
              </p>
            </div>
          </div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#a47bff]/50"
          >
            <ArrowLeft className="size-3" />
            Gate receipts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a47bff]/25 bg-[#a47bff]/7 px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#c1a8ff]">
              <BrainCircuit className="size-3" />
              {aiConfigured ? "AI READY · fallback armed" : "DETERMINISTIC FALLBACK"}
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-6xl">
              Ask why.
              <br />
              <span className="text-stroke">Never what to buy.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              Rafiki reads one verified receipt at a time. Numeric facts stay
              in deterministic fields. AI, when configured, may rewrite the
              explanation—but a validator rejects digits and trading language.
            </p>

            <div className="mt-7 space-y-2">
              <Boundary
                good
                copy="Explain the selected receipt and cite its hash."
              />
              <Boundary good copy="Fall back when AI is missing or rejected." />
              <Boundary copy="Cannot trade, size, approve, or change exits." />
              <Boundary copy="Cannot turn a PAPER result into a prediction." />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#31291f] bg-[#0d0b09] p-4">
              <Fingerprint
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  verified ? "text-pass" : "text-block",
                )}
              />
              <div>
                <p className="text-[10px] font-bold">
                  Local chain {verified ? "verified" : "broken"}
                </p>
                <p className="mt-1 text-[8px] text-[#6f685f]">
                  {receipts.length} receipts available in this browser
                </p>
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09]">
            <div className="grid min-h-[650px] md:grid-cols-[0.72fr_1.28fr]">
              <div className="border-b border-[#31291f] md:border-b-0 md:border-r">
                <div className="border-b border-[#31291f] p-4">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#a47bff]">
                    Local receipt tape
                  </p>
                  <p className="mt-1 text-[9px] text-[#6f685f]">
                    Select one verified record
                  </p>
                </div>
                {ordered.length ? (
                  <div className="max-h-[580px] overflow-y-auto">
                    {ordered.map((receipt) => (
                      <ReceiptRow
                        key={receipt.hash}
                        receipt={receipt}
                        active={selected?.hash === receipt.hash}
                        onClick={() => {
                          setSelectedHash(receipt.hash);
                          setResponse(null);
                          setError(null);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-72 items-center justify-center p-6 text-center">
                    <div>
                      <Fingerprint className="mx-auto size-5 text-[#4f4941]" />
                      <p className="mt-3 text-xs font-bold">
                        No receipt to explain.
                      </p>
                      <p className="mt-1 text-[9px] leading-relaxed text-[#6f685f]">
                        Open a launch in the Gate or write a PAPER fill first.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="border-b border-[#31291f] p-4 sm:p-5">
                  <label className="block text-[9px] font-bold text-[#91897e]">
                    Ask about this receipt
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      maxLength={240}
                      disabled={!selected}
                      className="launch-input min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void ask()}
                      disabled={!selected || loading}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#a47bff] text-[#090806] disabled:bg-[#242019] disabled:text-[#5f584f]"
                      aria-label="Ask Rafiki"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-center p-5 sm:p-7">
                  {error ? (
                    <div className="max-w-md text-center">
                      <AlertTriangle className="mx-auto size-6 text-block" />
                      <p className="mt-3 text-xs font-bold">Receipt rejected.</p>
                      <p className="mt-1 text-[9px] text-[#8e5e65]">{error}</p>
                    </div>
                  ) : response ? (
                    <ExplanationCard response={response} />
                  ) : (
                    <div className="max-w-md text-center">
                      <BrainCircuit className="mx-auto size-8 text-[#a47bff]" />
                      <p className="mt-4 text-sm font-bold">
                        {selected
                          ? "Rafiki is ready for this receipt."
                          : "Rafiki needs a receipt."}
                      </p>
                      <p className="mt-2 text-[9px] leading-relaxed text-[#6f685f]">
                        {selected
                          ? "Ask why. The response stays bounded to hash-verified facts."
                          : "Nothing is generated without a local, hash-verified record."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function ReceiptRow({
  receipt,
  active,
  onClick,
}: {
  receipt: Receipt;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full border-b border-[#272119] p-3 text-left last:border-0",
        active ? "bg-[#a47bff]/8" : "hover:bg-[#15120e]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] font-bold uppercase text-[#c1a8ff]">
          {receipt.actor} · {receipt.kind.replaceAll("_", " ")}
        </p>
        <span className="rounded border border-[#31291f] px-1 py-px font-mono text-[6px] text-[#6f685f]">
          {receipt.source}
        </span>
      </div>
      <p className="mt-2 truncate font-mono text-[7px] text-[#4f4941]">
        {receipt.hash}
      </p>
      <p className="mt-1 text-[7px] text-[#5f584f]">
        {new Date(receipt.at.ts).toLocaleString()}
      </p>
    </button>
  );
}

function ExplanationCard({ response }: { response: RafikiResponse }) {
  return (
    <article className="w-full max-w-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#a47bff]/25 bg-[#a47bff]/7 px-2.5 py-1 font-mono text-[7px] font-bold uppercase text-[#c1a8ff]">
          {response.source}
        </span>
        {response.fallbackReason ? (
          <span className="font-mono text-[7px] uppercase text-[#5f584f]">
            {response.fallbackReason}
          </span>
        ) : null}
      </div>
      <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">
        {response.explanation.headline}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-[#b6aea1]">
        {response.explanation.explanation}
      </p>
      <div className="mt-5 space-y-2">
        {response.explanation.facts.map((fact) => (
          <p
            key={fact}
            className="flex items-start gap-2 rounded-lg border border-[#272119] bg-[#090806] p-2.5 font-mono text-[8px] leading-relaxed text-[#91897e]"
          >
            <Check className="mt-0.5 size-3 shrink-0 text-[#a47bff]" />
            {fact}
          </p>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#ffb13c]/20 bg-[#ffb13c]/5 p-3">
        <CircleOff className="mt-0.5 size-3.5 shrink-0 text-[#ffb13c]" />
        <p className="text-[8px] leading-relaxed text-[#9f8358]">
          {response.explanation.boundary}
        </p>
      </div>
    </article>
  );
}

function Boundary({ good, copy }: { good?: boolean; copy: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-[#302a20] bg-[#0d0b09] p-3 text-[9px] leading-relaxed text-[#91897e]">
      {good ? (
        <Check className="mt-0.5 size-3 shrink-0 text-pass" />
      ) : (
        <CircleOff className="mt-0.5 size-3 shrink-0 text-[#6f685f]" />
      )}
      {copy}
    </p>
  );
}
