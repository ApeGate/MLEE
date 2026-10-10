"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleDot,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  createVaultPolicyPreview,
  type VaultPolicyDraft,
  type VaultPolicyPreview as VaultPolicy,
  type VaultProgram,
} from "../../../packages/core/src";
import type { PrivyVaultReadiness } from "@/lib/privy/config";
import { cn } from "@/lib/utils";
import { useReceipts } from "@/lib/use-receipts";

const DEFAULT_POLICY: VaultPolicyDraft = {
  ownerWallet: "",
  perTradeCapSol: 0.25,
  dailySpendCapSol: 1,
  maxOpenPositions: 5,
  profitSweepPct: 75,
  allowedPrograms: ["pump", "pumpswap"],
};

const PROGRAMS: Array<{
  id: VaultProgram;
  label: string;
  purpose: string;
}> = [
  { id: "pump", label: "Pump curve", purpose: "Fresh bonding-curve orders" },
  { id: "pumpswap", label: "PumpSwap", purpose: "Graduated pool exits" },
  { id: "jupiter", label: "Jupiter fallback", purpose: "Fallback routing only" },
];

export function VaultPreview({
  readiness,
}: {
  readiness: PrivyVaultReadiness;
}) {
  const { addVaultPreview } = useReceipts();
  const [draft, setDraft] = useState<VaultPolicyDraft>(DEFAULT_POLICY);
  const [preview, setPreview] = useState<VaultPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  function update<K extends keyof VaultPolicyDraft>(
    key: K,
    value: VaultPolicyDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setRecorded(false);
    setError(null);
  }

  function toggleProgram(program: VaultProgram) {
    update(
      "allowedPrograms",
      draft.allowedPrograms.includes(program)
        ? draft.allowedPrograms.filter((item) => item !== program)
        : [...draft.allowedPrograms, program],
    );
  }

  async function buildPreview() {
    try {
      setPreview(await createVaultPolicyPreview(draft, Date.now()));
      setError(null);
      setRecorded(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Policy is invalid",
      );
    }
  }

  async function recordPreview() {
    if (!preview) return;
    await addVaultPreview(preview.policyHash, preview.ownerWallet);
    setRecorded(true);
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
              <p className="text-xs font-bold">Cornelius · Privy Vault</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Policy preview · signer disabled
              </p>
            </div>
          </div>
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#5cc8ff]/50"
          >
            <ArrowLeft className="size-3" />
            Plans
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr]">
          <aside>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#5cc8ff]">
              Worst case, defined first
            </p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-6xl">
              Preview the cage.
              <br />
              <span className="text-stroke">Not the key.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              This scaffold hashes the limits a future separate Privy wallet
              would enforce. It cannot create a wallet, authorize a signer,
              fund an address, or send a transaction.
            </p>

            <div className="mt-7 space-y-2">
              <StatusLine
                label="Privy server SDK"
                ready={readiness.sdkInstalled}
                readyCopy="Wired"
                missingCopy="Not installed"
              />
              <StatusLine
                label="Browser app ID"
                ready={readiness.browserAppIdConfigured}
                readyCopy="Configured"
                missingCopy="Add public ID"
              />
              <StatusLine
                label="Server app ID"
                ready={readiness.appIdConfigured}
                readyCopy="Configured"
                missingCopy="Add server ID"
              />
              <StatusLine
                label="App IDs match"
                ready={readiness.appIdsMatch}
                readyCopy="Same app"
                missingCopy="Check IDs"
              />
              <StatusLine
                label="App secret"
                ready={readiness.appSecretConfigured}
                readyCopy="Configured"
                missingCopy="Add secret"
              />
              <StatusLine
                label="Authorization key"
                ready={readiness.authorizationKeyConfigured}
                readyCopy="Configured"
                missingCopy="Add PKCS8 key"
              />
              <StatusLine
                label="External security review"
                ready={readiness.externalSecurityReviewComplete}
                readyCopy="Complete"
                missingCopy="Not complete"
              />
              <StatusLine
                label="Execution flag"
                ready={readiness.executionEnabled}
                readyCopy="Enabled"
                missingCopy="Hard off"
              />
            </div>

            <div className="mt-5 rounded-xl border border-[#302a20] bg-[#0d0b09] p-4">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#86d8ff]">
                Drop-in credential map
              </p>
              <div className="mt-3 space-y-1.5 font-mono text-[7px] text-[#777066]">
                <p>NEXT_PUBLIC_PRIVY_APP_ID</p>
                <p>PRIVY_APP_ID</p>
                <p>PRIVY_APP_SECRET</p>
                <p>PRIVY_AUTHORIZATION_PRIVATE_KEY</p>
              </div>
              <p className="mt-3 text-[8px] leading-relaxed text-[#6f685f]">
                Copy the same dashboard App ID into both ID fields. Keep the
                secret and base64 PKCS8 authorization key server-side.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-[#ffb13c]/25 bg-[#ffb13c]/6 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ffb13c]" />
                <p className="text-[9px] leading-relaxed text-[#a88c5e]">
                  Credentials alone never unlock automation. The transaction
                  firewall, policy signer, mainnet canaries, revoke test, and
                  external security review are all hard prerequisites.
                </p>
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#31291f] p-5 sm:p-6">
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#5cc8ff]">
                  Privy policy draft
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  Caps the signer cannot loosen.
                </h2>
              </div>
              <span className="rounded border border-[#5cc8ff]/25 bg-[#5cc8ff]/7 px-2 py-1 font-mono text-[7px] font-bold uppercase text-[#86d8ff]">
                HYPOTHETICAL
              </span>
            </div>

            <div className="grid border-b border-[#31291f] md:grid-cols-2">
              <div className="space-y-4 border-b border-[#31291f] p-5 md:border-b-0 md:border-r sm:p-6">
                <VaultField
                  label="Owner wallet"
                  hint="Only withdrawal destination"
                >
                  <input
                    value={draft.ownerWallet}
                    onChange={(event) =>
                      update("ownerWallet", event.target.value)
                    }
                    placeholder="Paste your Solana address"
                    className="launch-input font-mono"
                  />
                </VaultField>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Per-trade cap"
                    value={draft.perTradeCapSol}
                    step={0.05}
                    suffix="SOL"
                    onChange={(value) => update("perTradeCapSol", value)}
                  />
                  <NumberField
                    label="Daily spend cap"
                    value={draft.dailySpendCapSol}
                    step={0.25}
                    suffix="SOL"
                    onChange={(value) => update("dailySpendCapSol", value)}
                  />
                  <NumberField
                    label="Open positions"
                    value={draft.maxOpenPositions}
                    step={1}
                    max={50}
                    onChange={(value) => update("maxOpenPositions", value)}
                  />
                  <NumberField
                    label="Profit sweep"
                    value={draft.profitSweepPct}
                    step={5}
                    max={100}
                    suffix="%"
                    onChange={(value) => update("profitSweepPct", value)}
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <p className="text-[9px] font-bold text-[#91897e]">
                    Allowed programs
                  </p>
                  <div className="mt-2 space-y-2">
                    {PROGRAMS.map((program) => (
                      <label
                        key={program.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                          draft.allowedPrograms.includes(program.id)
                            ? "border-[#5cc8ff]/30 bg-[#5cc8ff]/6"
                            : "border-[#31291f] bg-[#090806]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={draft.allowedPrograms.includes(program.id)}
                          onChange={() => toggleProgram(program.id)}
                          className="mt-0.5 size-4 accent-[#5cc8ff]"
                        />
                        <span>
                          <span className="block text-[10px] font-bold">
                            {program.label}
                          </span>
                          <span className="mt-1 block text-[8px] text-[#6f685f]">
                            {program.purpose}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-pass/20 bg-pass/5 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-pass" />
                    <p className="text-[9px] font-bold text-pass">
                      Withdraw home only
                    </p>
                  </div>
                  <p className="mt-1 text-[8px] leading-relaxed text-[#668e7a]">
                    The owner wallet above is copied into the immutable
                    withdrawal destination. No alternate address is accepted.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <button
                type="button"
                onClick={() => void buildPreview()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5cc8ff] px-4 py-3 text-xs font-extrabold text-[#090806]"
              >
                <Fingerprint className="size-3.5" />
                Hash policy preview
              </button>
              {error ? (
                <p className="mt-3 rounded-xl border border-block/20 bg-block/6 p-3 text-[9px] text-block">
                  {error}
                </p>
              ) : null}

              {preview ? (
                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-xl border border-[#272119] bg-[#090806] p-4">
                    <p className="font-mono text-[7px] uppercase tracking-wider text-[#4f4941]">
                      Policy hash
                    </p>
                    <p className="mt-2 break-all font-mono text-[9px] text-[#91897e]">
                      {preview.policyHash}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[8px]">
                      <PolicyStat label="Provider" value="PRIVY" />
                      <PolicyStat label="Execution" value="OFF" />
                      <PolicyStat
                        label="Per trade"
                        value={`${preview.perTradeCapSol} SOL`}
                      />
                      <PolicyStat
                        label="Daily"
                        value={`${preview.dailySpendCapSol} SOL`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => void recordPreview()}
                      disabled={recorded}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#5cc8ff]/30 bg-[#5cc8ff]/7 px-4 py-3 text-xs font-bold text-[#86d8ff] disabled:opacity-60"
                    >
                      {recorded ? (
                        <>
                          <Check className="size-3.5" /> Receipt written
                        </>
                      ) : (
                        <>
                          <KeyRound className="size-3.5" /> Record preview
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#31291f] px-4 py-3 text-xs font-bold text-[#554f47]"
                    >
                      <LockKeyhole className="size-3.5" />
                      Create Vault locked
                    </button>
                    <p className="text-center font-mono text-[7px] uppercase tracking-[0.11em] text-[#4f4941]">
                      No wallet created · no funds moved
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#31291f]">
                  <p className="flex items-center gap-2 text-[9px] text-[#5f584f]">
                    <CircleDot className="size-3" />
                    Valid inputs produce a local policy hash only.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatusLine({
  label,
  ready,
  readyCopy,
  missingCopy,
}: {
  label: string;
  ready: boolean;
  readyCopy: string;
  missingCopy: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#302a20] bg-[#0d0b09] p-3">
      <span className="flex items-center gap-2 text-[9px] text-[#91897e]">
        {ready ? (
          <Check className="size-3 text-pass" />
        ) : (
          <CircleDot className="size-3 text-wait" />
        )}
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[7px] font-bold uppercase",
          ready ? "text-pass" : "text-[#6f685f]",
        )}
      >
        {ready ? readyCopy : missingCopy}
      </span>
    </div>
  );
}

function VaultField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] font-bold text-[#91897e]">{label}</span>
        {hint ? (
          <span className="text-[7px] text-[#4f4941]">{hint}</span>
        ) : null}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function NumberField({
  label,
  value,
  step,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  max?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <VaultField label={label} hint={suffix}>
      <input
        type="number"
        min={step}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="launch-input font-mono"
      />
    </VaultField>
  );
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#272119] p-2">
      <p className="font-mono text-[8px] font-bold text-[#b6aea1]">{value}</p>
      <p className="mt-1 text-[7px] text-[#4f4941]">{label}</p>
    </div>
  );
}
