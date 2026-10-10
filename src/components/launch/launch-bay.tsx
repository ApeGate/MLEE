"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDot,
  Coins,
  ImageIcon,
  Info,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  preflightLaunch,
  type LaunchDraft,
  type LaunchPreflight,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";

const INITIAL_DRAFT: LaunchDraft = {
  name: "",
  symbol: "",
  description: "",
  imageUrl: "",
  website: "",
  socialUrl: "",
  quoteAsset: "SOL",
  holderRewards: false,
  mayhemMode: false,
  devBuyPct: 0,
  guardrailsAccepted: false,
};

const STEPS = [
  { id: "details", label: "Details", owner: "Kong" },
  { id: "token", label: "Token setup", owner: "Caesar" },
  { id: "preflight", label: "Preflight", owner: "Kong" },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function LaunchBay() {
  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<LaunchDraft>(INITIAL_DRAFT);
  const [preflight, setPreflight] = useState<LaunchPreflight | null>(null);
  const [checking, setChecking] = useState(false);

  function update<K extends keyof LaunchDraft>(
    key: K,
    value: LaunchDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreflight(null);
  }

  async function runPreflight() {
    setChecking(true);
    const result = await preflightLaunch(draft);
    setPreflight(result);
    setStep("preflight");
    setChecking(false);
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
              <p className="text-xs font-bold">Launch Bay</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Kong + Caesar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#9ab7ff]/25 bg-[#9ab7ff]/7 px-2.5 py-1 font-mono text-[7px] font-bold uppercase tracking-wider text-[#9ab7ff] sm:inline-flex">
              Phase 1 · prepare only
            </span>
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#ff7250]/50"
            >
              <ArrowLeft className="size-3" /> Live Gate
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[0.76fr_1.24fr]">
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7ff45]">
              Approved · ordered safely
            </p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-6xl">
              Launch through
              <br />
              <span className="text-[#ff4f1f]">the Gate.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              Prepare clean metadata, keep the creator buy visible, and let
              Kong flag what scanners will see. This release stops before
              transaction building or signing.
            </p>

            <ol className="mt-8 border-t border-[#31291f]">
              {STEPS.map((item, index) => {
                const active = step === item.id;
                const currentIndex = STEPS.findIndex(
                  (entry) => entry.id === step,
                );
                const done = index < currentIndex;
                return (
                  <li key={item.id} className="border-b border-[#31291f]">
                    <button
                      type="button"
                      onClick={() => setStep(item.id)}
                      className="flex w-full items-center justify-between gap-3 py-4 text-left"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg border font-mono text-[8px] font-bold",
                            active
                              ? "border-[#ff7250] bg-[#ff4f1f] text-[#090806]"
                              : done
                                ? "border-[#c7ff45]/30 bg-[#c7ff45]/8 text-[#c7ff45]"
                                : "border-[#31291f] text-[#5f584f]",
                          )}
                        >
                          {done ? <Check className="size-3" /> : `0${index + 1}`}
                        </span>
                        <span>
                          <span
                            className={cn(
                              "block text-xs font-bold",
                              active ? "text-[#f4efe5]" : "text-[#91897e]",
                            )}
                          >
                            {item.label}
                          </span>
                          <span className="mt-0.5 block font-mono text-[7px] uppercase text-[#554f47]">
                            {item.owner}
                          </span>
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "size-3",
                          active ? "text-[#ff7250]" : "text-[#4f4941]",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-xl border border-[#302a20] bg-[#12100c] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#9ab7ff]" />
                <div>
                  <p className="text-xs font-bold">Phase order stays intact</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#6f685f]">
                    The Gate is live first. Trading, transaction firewall, and
                    manual signing fundamentals land before Launch Bay can
                    build a create_v2 transaction.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09] shadow-[0_35px_90px_rgb(0_0_0_/_35%)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#31291f] px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.17em] text-[#ff7250]">
                  {step === "details"
                    ? "01 · Identity & metadata"
                    : step === "token"
                      ? "02 · Token setup"
                      : "03 · Kong preflight"}
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">
                  {step === "details"
                    ? "Tell the chain what this is."
                    : step === "token"
                      ? "Make every choice visible."
                      : "See what gets through."}
                </h2>
              </div>
              <span className="rounded border border-[#ff7250]/20 bg-[#ff4f1f]/7 px-2 py-1 font-mono text-[7px] font-bold uppercase text-[#ff8a64]">
                Local draft
              </span>
            </div>

            {step === "details" ? (
              <DetailsStep draft={draft} update={update} />
            ) : step === "token" ? (
              <TokenStep draft={draft} update={update} />
            ) : (
              <PreflightStep
                draft={draft}
                preflight={preflight}
                checking={checking}
                onRun={() => void runPreflight()}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#31291f] bg-[#090806]/70 px-5 py-4 sm:px-6">
              <p className="max-w-md text-[9px] leading-relaxed text-[#5f584f]">
                Drafts stay in this tab. Nothing is uploaded, signed, or sent.
              </p>
              <div className="flex gap-2">
                {step !== "details" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep(step === "preflight" ? "token" : "details")
                    }
                    className="rounded-lg border border-[#31291f] px-4 py-2.5 text-xs font-bold hover:border-[#ff7250]/50"
                  >
                    Back
                  </button>
                ) : null}
                {step === "details" ? (
                  <button
                    type="button"
                    onClick={() => setStep("token")}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#ff4f1f] px-4 py-2.5 text-xs font-extrabold text-[#090806] hover:bg-[#ff6438]"
                  >
                    Token setup <ChevronRight className="size-3" />
                  </button>
                ) : step === "token" ? (
                  <button
                    type="button"
                    onClick={() => void runPreflight()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#ff4f1f] px-4 py-2.5 text-xs font-extrabold text-[#090806] hover:bg-[#ff6438]"
                  >
                    Run Kong preflight <ShieldCheck className="size-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[#31291f] bg-[#17130e] px-4 py-2.5 text-xs font-bold text-[#554f47]"
                  >
                    <LockKeyhole className="size-3" />
                    create_v2 build locked
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DetailsStep({
  draft,
  update,
}: {
  draft: LaunchDraft;
  update: <K extends keyof LaunchDraft>(
    key: K,
    value: LaunchDraft[K],
  ) => void;
}) {
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_0.45fr]">
        <Field label="Token name" hint="2–32 characters">
          <input
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Banana Hours"
            maxLength={32}
            className="launch-input"
          />
        </Field>
        <Field label="Ticker" hint="2–10 letters or numbers">
          <input
            value={draft.symbol}
            onChange={(event) =>
              update(
                "symbol",
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              )
            }
            placeholder="BNNA"
            maxLength={10}
            className="launch-input font-mono uppercase"
          />
        </Field>
      </div>

      <Field
        label="Description"
        hint={`${draft.description.length}/500 · Kong warns on thin metadata`}
      >
        <textarea
          value={draft.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Say what it is without promises, hype guarantees, or hidden terms."
          maxLength={500}
          rows={5}
          className="launch-input min-h-28 resize-y py-3"
        />
      </Field>

      <Field label="Image URL" hint="HTTPS only in the preparation scaffold">
        <div className="relative">
          <ImageIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#5f584f]" />
          <input
            type="url"
            value={draft.imageUrl}
            onChange={(event) => update("imageUrl", event.target.value)}
            placeholder="https://…/token.png"
            className="launch-input pl-9"
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" hint="Optional · HTTPS">
          <input
            type="url"
            value={draft.website}
            onChange={(event) => update("website", event.target.value)}
            placeholder="https://project.example"
            className="launch-input"
          />
        </Field>
        <Field label="Social" hint="Optional · HTTPS">
          <input
            type="url"
            value={draft.socialUrl}
            onChange={(event) => update("socialUrl", event.target.value)}
            placeholder="https://x.com/…"
            className="launch-input"
          />
        </Field>
      </div>
    </div>
  );
}

function TokenStep({
  draft,
  update,
}: {
  draft: LaunchDraft;
  update: <K extends keyof LaunchDraft>(
    key: K,
    value: LaunchDraft[K],
  ) => void;
}) {
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <Field label="Quote asset" hint="Shown on every preview and receipt">
        <div className="grid grid-cols-2 gap-2">
          {(["SOL", "USDC"] as const).map((asset) => (
            <button
              key={asset}
              type="button"
              onClick={() => update("quoteAsset", asset)}
              className={cn(
                "rounded-xl border p-4 text-left",
                draft.quoteAsset === asset
                  ? "border-[#ff7250] bg-[#ff4f1f]/8"
                  : "border-[#31291f] bg-[#090806] hover:border-[#4b4134]",
              )}
            >
              <Coins
                className={cn(
                  "size-4",
                  draft.quoteAsset === asset
                    ? "text-[#ff7250]"
                    : "text-[#6f685f]",
                )}
              />
              <p className="mt-3 text-sm font-extrabold">{asset}</p>
              <p className="mt-1 text-[9px] text-[#6f685f]">
                {asset === "SOL"
                  ? "Default Pump quote"
                  : "Stable quote visibility"}
              </p>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Creator buy"
        hint="Shown as supply percentage; Standard warns at 5% and blocks at 20%"
      >
        <div className="rounded-xl border border-[#31291f] bg-[#090806] p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-3xl font-extrabold text-[#ff7250]">
                {draft.devBuyPct.toFixed(1)}%
              </p>
              <p className="mt-1 text-[9px] text-[#6f685f]">
                of supply · visible on receipt
              </p>
            </div>
            <RiskLine value={draft.devBuyPct} />
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={0.5}
            value={draft.devBuyPct}
            onChange={(event) =>
              update("devBuyPct", Number(event.target.value))
            }
            className="mt-5 w-full accent-[#ff4f1f]"
          />
          <div className="mt-2 flex justify-between font-mono text-[7px] text-[#4f4941]">
            <span>0%</span>
            <span className="text-[#ffb13c]">WARN 5%</span>
            <span className="text-[#ff655f]">BLOCK 20%</span>
            <span>30%</span>
          </div>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard
          title="Holder rewards"
          body="Record holder-reward mode in metadata and the final receipt."
          checked={draft.holderRewards}
          onChange={(checked) => update("holderRewards", checked)}
        />
        <ToggleCard
          title="Mayhem mode"
          body="Off by default. Kong raises attention when this is enabled."
          checked={draft.mayhemMode}
          onChange={(checked) => update("mayhemMode", checked)}
          warning
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#9ab7ff]/25 bg-[#9ab7ff]/6 p-4">
        <input
          type="checkbox"
          checked={draft.guardrailsAccepted}
          onChange={(event) =>
            update("guardrailsAccepted", event.target.checked)
          }
          className="mt-0.5 size-4 accent-[#9ab7ff]"
        />
        <span>
          <span className="block text-xs font-bold">
            Clean-launch guardrails
          </span>
          <span className="mt-1 block text-[10px] leading-relaxed text-[#8498c4]">
            I&apos;m using one creator wallet with no bundled buys, volume bots,
            promotion service, or impersonation.
          </span>
        </span>
      </label>
    </div>
  );
}

function PreflightStep({
  draft,
  preflight,
  checking,
  onRun,
}: {
  draft: LaunchDraft;
  preflight: LaunchPreflight | null;
  checking: boolean;
  onRun: () => void;
}) {
  if (!preflight) {
    return (
      <div className="flex min-h-[520px] items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#ff7250]/30 bg-[#ff4f1f]/8 text-[#ff7250]">
            <ShieldCheck className="size-6" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold">Ready for Kong?</h3>
          <p className="mt-2 text-xs leading-relaxed text-[#6f685f]">
            Run deterministic local checks now. Build-time chain and image
            checks remain pending until the transaction phase is enabled.
          </p>
          <button
            type="button"
            onClick={onRun}
            disabled={checking}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff4f1f] px-5 py-3 text-sm font-extrabold text-[#090806]"
          >
            {checking ? "Checking…" : "Run preflight"}
            <ShieldCheck className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  const stamp = {
    PREPARED: "border-[#c7ff45] text-[#c7ff45]",
    WARN: "border-[#ffb13c] text-[#ffb13c]",
    BLOCK: "border-[#ff655f] text-[#ff817c]",
  }[preflight.kind];

  return (
    <div className="grid md:grid-cols-[1.1fr_0.9fr]">
      <div className="border-b border-[#31291f] p-5 sm:p-6 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Kong&apos;s local checks</p>
            <p className="mt-0.5 text-[9px] text-[#6f685f]">
              Deterministic · draft inputs only
            </p>
          </div>
          <span
            className={cn(
              "rotate-[-3deg] rounded-md border-2 px-3 py-1 font-mono text-[10px] font-black tracking-[0.1em]",
              stamp,
            )}
          >
            {preflight.kind}
          </span>
        </div>
        <div className="mt-5 space-y-2">
          {preflight.checks.map((check) => (
            <div
              key={check.id}
              className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-[#272119] bg-[#090806]/50 p-3"
            >
              <LaunchCheckIcon outcome={check.outcome} />
              <div>
                <p className="text-[10px] font-bold">{check.label}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-[#6f685f]">
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onRun}
          className="mt-4 text-[9px] font-bold text-[#ff7250] hover:underline"
        >
          Re-run local preflight
        </button>
      </div>

      <aside className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
              Clean Launch Receipt
            </p>
            <h3 className="mt-1 text-lg font-extrabold">Draft preview</h3>
          </div>
          <span className="rounded border border-[#ff7250]/20 bg-[#ff4f1f]/7 px-2 py-1 font-mono text-[7px] font-bold text-[#ff8a64]">
            PREVIEW
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-[#31291f] bg-[#090806] p-4">
          <ReceiptField label="Name" value={draft.name || "Not set"} />
          <ReceiptField
            label="Ticker"
            value={draft.symbol ? `$${draft.symbol}` : "Not set"}
          />
          <ReceiptField label="Quote" value={draft.quoteAsset} />
          <ReceiptField
            label="Creator buy"
            value={`${draft.devBuyPct.toFixed(1)}%`}
          />
          <ReceiptField
            label="Mayhem"
            value={draft.mayhemMode ? "On" : "Off"}
          />
          <ReceiptField
            label="Holder rewards"
            value={draft.holderRewards ? "On" : "Off"}
          />
        </div>

        <div className="mt-3 rounded-xl border border-[#31291f] bg-[#090806] p-4">
          <p className="font-mono text-[7px] uppercase tracking-wider text-[#4f4941]">
            Metadata hash
          </p>
          <p className="mt-1 break-all font-mono text-[9px] text-[#91897e]">
            {preflight.metadataHash}
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-[#ffb13c]/25 bg-[#ffb13c]/6 p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[#ffb13c]" />
            <p className="text-[9px] leading-relaxed text-[#c5a36c]">
              This preview records your draft, not observed chain facts. It is
              not a Clean Launch Receipt or endorsement. The final receipt only
              exists after a confirmed single-signer creation.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <p className="font-mono text-[7px] font-bold uppercase tracking-wider text-[#5f584f]">
            Still required at build time
          </p>
          {preflight.pendingServerChecks.map((check) => (
            <p
              key={check}
              className="flex items-center gap-2 text-[9px] text-[#6f685f]"
            >
              <CircleDot className="size-2.5 text-[#9ab7ff]" />
              {check}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold">{label}</span>
        <span className="text-right text-[8px] text-[#5f584f]">{hint}</span>
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function ToggleCard({
  title,
  body,
  checked,
  onChange,
  warning,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  warning?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4",
        checked
          ? warning
            ? "border-[#ffb13c]/35 bg-[#ffb13c]/7"
            : "border-[#c7ff45]/30 bg-[#c7ff45]/6"
          : "border-[#31291f] bg-[#090806]",
      )}
    >
      <span>
        <span className="block text-xs font-bold">{title}</span>
        <span className="mt-1 block text-[9px] leading-relaxed text-[#6f685f]">
          {body}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[#ff4f1f]"
      />
    </label>
  );
}

function RiskLine({ value }: { value: number }) {
  const config =
    value >= 20
      ? { label: "BLOCK", className: "text-[#ff817c]" }
      : value >= 5
        ? { label: "WARN", className: "text-[#ffb13c]" }
        : { label: "UNDER WARN", className: "text-[#c7ff45]" };
  return (
    <span
      className={cn(
        "font-mono text-[8px] font-bold uppercase",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function LaunchCheckIcon({ outcome }: { outcome: string }) {
  if (outcome === "pass") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-[#c7ff45]/10 text-[#c7ff45]">
        <Check className="size-3" />
      </span>
    );
  }
  if (outcome === "fail") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-[#ff655f]/10 text-[#ff817c]">
        <X className="size-3" />
      </span>
    );
  }
  if (outcome === "warn") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-[#ffb13c]/10 text-[#ffb13c]">
        <Info className="size-3" />
      </span>
    );
  }
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-[#9ab7ff]/10 text-[#9ab7ff]">
      <CircleDot className="size-3" />
    </span>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#272119] py-2.5 first:pt-0 last:border-0 last:pb-0">
      <span className="text-[9px] text-[#5f584f]">{label}</span>
      <span className="max-w-[62%] truncate text-right font-mono text-[9px] font-bold text-[#b6aea1]">
        {value}
      </span>
    </div>
  );
}
